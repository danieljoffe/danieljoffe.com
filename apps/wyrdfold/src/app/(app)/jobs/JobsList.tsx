'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import Button from '@/components/Button';
import { useToast } from '@/state/Toast/ToastProvider';
import { cn } from '@/lib/cn';
import type { UserTargetWithTarget } from '../targets/types';
import BatchActionBar from './BatchActionBar';
import JobsListView from './JobsListView';
import type { JobPosting, JobsFilterState } from './types';

interface TargetTab {
  id: string;
  label: string;
}

const INITIAL_FILTERS: JobsFilterState = {
  minScore: '',
  status: '',
  search: '',
};

const TARGET_FILTERS: JobsFilterState = {
  minScore: '45',
  status: '',
  search: '',
};

const BATCH_POLL_INTERVAL = 3000;

interface JobsListProps {
  targetId: string | undefined;
  initialStatus?: string;
  initialMinScore?: string;
}

export default function JobsList({
  targetId,
  initialStatus,
  initialMinScore,
}: JobsListProps) {
  const [filters, setFilters] = useState<JobsFilterState>(() => {
    const base = targetId ? TARGET_FILTERS : INITIAL_FILTERS;
    return {
      ...base,
      ...(initialStatus ? { status: initialStatus } : {}),
      ...(initialMinScore ? { minScore: initialMinScore } : {}),
    };
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<
    { completed: number; total: number } | undefined
  >(undefined);
  const [exporting, setExporting] = useState(false);
  const [visiblePostings, setVisiblePostings] = useState<JobPosting[]>([]);
  const [targets, setTargets] = useState<TargetTab[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [activeTargetId, setActiveTargetId] = useState<string | undefined>(
    targetId
  );
  const [activationStatus, setActivationStatus] = useState<string>('idle');
  const activatingRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const { toast } = useToast();
  const router = useRouter();

  // Fetch targets for tab bar — uses the per-user link so tabs reflect
  // what THIS user has active, not what's globally active across users.
  useEffect(() => {
    async function fetchTargets() {
      try {
        const res = await fetch('/api/targets/mine');
        if (!res.ok) return;
        const { targets } = (await res.json()) as {
          targets: UserTargetWithTarget[];
        };
        const activeTargets: TargetTab[] = targets
          .filter(t => t.user_target.is_active)
          .map(t => ({ id: t.target.id, label: t.target.label }));
        setTargets(activeTargets);
        if (targetId && !activeTargets.some(t => t.id === targetId)) {
          // URL target is not active for this user — redirect to All Jobs
          setActiveTargetId(undefined);
          setFilters(INITIAL_FILTERS);
          router.replace('/jobs', { scroll: false });
        }
      } catch {
        // Non-critical — tabs just won't show
      } finally {
        setTargetsLoading(false);
      }
    }
    fetchTargets();
  }, [targetId]);

  // Check target activation status when switching tabs
  useEffect(() => {
    if (!activeTargetId) return;

    let cancelled = false;
    const statusPollRef: {
      current: ReturnType<typeof setInterval> | undefined;
    } = { current: undefined };

    async function checkStatus() {
      try {
        const res = await fetch(`/api/targets/${activeTargetId}/status`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          activation_status: string;
          jobs_count: number;
        };
        if (cancelled) return;

        setActivationStatus(data.activation_status);

        if (data.activation_status === 'ready') {
          // Jobs are ready — refresh the table
          if (statusPollRef.current) clearInterval(statusPollRef.current);
          setRefreshKey(k => k + 1);
        } else if (
          data.activation_status === 'idle' &&
          !activatingRef.current.has(activeTargetId!)
        ) {
          // Target hasn't been activated yet — trigger activation
          activatingRef.current.add(activeTargetId!);
          await fetch(`/api/targets/${activeTargetId}/activate`, {
            method: 'POST',
          });
          // Start polling for status updates
          statusPollRef.current = setInterval(checkStatus, 3000);
        } else if (
          data.activation_status === 'deriving' ||
          data.activation_status === 'polling'
        ) {
          // Pipeline in progress — keep polling
          if (!statusPollRef.current) {
            statusPollRef.current = setInterval(checkStatus, 3000);
          }
        } else if (data.activation_status === 'error') {
          if (statusPollRef.current) clearInterval(statusPollRef.current);
        }
      } catch {
        // Non-critical — will retry on next interval or tab switch
      }
    }

    checkStatus();

    return () => {
      cancelled = true;
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [activeTargetId]);

  const handleTabChange = useCallback(
    (id: string | undefined) => {
      setActiveTargetId(id);
      setActivationStatus('idle');
      setSelectedIds(new Set());
      setFilters(id ? TARGET_FILTERS : INITIAL_FILTERS);
      const url = id ? `/jobs?target=${id}` : '/jobs';
      router.replace(url, { scroll: false });
    },
    [router]
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleBatchGenerate = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setGenerating(true);
    try {
      const res = await fetch('/api/jobs/tailor/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_posting_ids: [...selectedIds],
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast({
          variant: 'error',
          title:
            (err as Record<string, string> | null)?.detail ??
            'Batch generation failed',
        });
        setGenerating(false);
        return;
      }

      const { batch_id, total } = (await res.json()) as {
        batch_id: string;
        total: number;
      };
      setBatchProgress({ completed: 0, total });

      // Poll for completion — clear any stale interval first
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/jobs/tailor/batch/${batch_id}`);
          if (!pollRes.ok) return;

          const batch = (await pollRes.json()) as {
            status: string;
            completed: number;
            failed: number;
            total: number;
          };

          // F3-B: surface live progress in the action bar
          setBatchProgress({
            completed: batch.completed + batch.failed,
            total: batch.total,
          });

          if (batch.status === 'completed' || batch.status === 'failed') {
            clearInterval(pollRef.current);
            pollRef.current = undefined;
            setGenerating(false);
            setBatchProgress(undefined);
            setSelectedIds(new Set());
            setRefreshKey(k => k + 1);

            if (batch.failed > 0) {
              toast({
                variant: 'warning',
                title: `Batch done: ${batch.completed} succeeded, ${batch.failed} failed`,
              });
            } else {
              toast({
                variant: 'success',
                title: `${batch.completed} resumes generated`,
              });
            }
          }
        } catch {
          // polling error — keep trying
        }
      }, BATCH_POLL_INTERVAL);
    } catch {
      toast({ variant: 'error', title: 'Network error starting batch' });
      setGenerating(false);
      setBatchProgress(undefined);
    }
  }, [selectedIds, toast]);

  const handleBatchExport = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setExporting(true);
    try {
      // Fetch resume IDs for selected jobs in parallel
      const results = await Promise.allSettled(
        [...selectedIds].map(jobId =>
          fetch(`/api/jobs/tailor/by-job/${jobId}`).then(async res => {
            if (!res.ok) return null;
            const record = (await res.json()) as {
              id: string;
              approved_at: string | null;
            };
            return record.approved_at ? record.id : null;
          })
        )
      );
      const resumeIds = results
        .filter(
          (r): r is PromiseFulfilledResult<string> =>
            r.status === 'fulfilled' && r.value !== null
        )
        .map(r => r.value);

      if (resumeIds.length === 0) {
        toast({ variant: 'warning', title: 'No approved resumes to export' });
        return;
      }

      const res = await fetch('/api/jobs/tailor/export-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume_ids: resumeIds }),
      });

      if (!res.ok) {
        toast({ variant: 'error', title: 'Export failed' });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resumes.zip';
      a.click();
      URL.revokeObjectURL(url);
      toast({
        variant: 'success',
        title: `Exported ${resumeIds.length} resumes`,
      });
    } catch {
      toast({ variant: 'error', title: 'Network error exporting resumes' });
    } finally {
      setExporting(false);
    }
  }, [selectedIds, toast]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    /* eslint-disable no-alert -- personal tool */
    if (!window.confirm(`Delete ${selectedIds.size} jobs?`)) return;
    /* eslint-enable no-alert */

    const deleteResults = await Promise.allSettled(
      [...selectedIds].map(id => fetch(`/api/jobs/${id}`, { method: 'DELETE' }))
    );
    const deleted = deleteResults.filter(
      r => r.status === 'fulfilled' && r.value.ok
    ).length;

    toast({
      variant: deleted > 0 ? 'success' : 'error',
      title: deleted > 0 ? `Deleted ${deleted} jobs` : 'Failed to delete jobs',
    });
    setSelectedIds(new Set());
    setRefreshKey(k => k + 1);
  }, [selectedIds, toast]);

  // When the action bar is visible it overlaps the bottom of the table /
  // pagination. Mobile bar is two-row (~5.5rem) + gap, desktop is single-row
  // (~3.25rem). Reserve enough space at each breakpoint to scroll past it.
  const bottomPadClass = selectedIds.size > 0 ? 'pb-28 md:pb-20' : '';

  return (
    <div className={`flex flex-col gap-6 ${bottomPadClass}`}>
      <div>
        <Heading variant='hero' as='h1'>
          Jobs
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Postings matched to your active targets
        </Text>
      </div>

      {targetsLoading ? (
        <div className='flex gap-1 border-b border-border pb-px'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant='rectangular' width={90} height={36} />
          ))}
        </div>
      ) : targets.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center gap-3 py-12'>
            <Text variant='body' as='p'>
              No active targets. Activate a target to start seeing matched jobs.
            </Text>
            <Button
              name='jobs-go-to-targets'
              variant='primary'
              size='sm'
              as='link'
              href='/targets'
            >
              Go to Targets
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className='border-b border-border'>
            <div role='tablist' className='flex gap-1 overflow-x-auto'>
              <button
                role='tab'
                aria-selected={activeTargetId === undefined}
                onClick={() => handleTabChange(undefined)}
                className={cn(
                  'shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  activeTargetId === undefined
                    ? 'border-brand-500 text-brand-500'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                )}
              >
                All Jobs
              </button>
              {targets.map(target => (
                <button
                  key={target.id}
                  role='tab'
                  aria-selected={activeTargetId === target.id}
                  onClick={() => handleTabChange(target.id)}
                  className={cn(
                    'shrink-0 border-b-2 px-4 py-2.5 text-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                    activeTargetId === target.id
                      ? 'border-brand-500 text-brand-500'
                      : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                  )}
                >
                  {target.label}
                </button>
              ))}
            </div>
          </div>

          {activeTargetId && activationStatus === 'deriving' && (
            <div className='flex items-center gap-2 text-sm text-text-secondary'>
              <Spinner size='sm' aria-label='Analyzing target' />
              <span>Analyzing target profile...</span>
            </div>
          )}

          {activeTargetId && activationStatus === 'polling' && (
            <div className='flex items-center gap-2 text-sm text-text-secondary'>
              <Spinner size='sm' aria-label='Searching for jobs' />
              <span>Searching for matching jobs...</span>
            </div>
          )}

          {activeTargetId && activationStatus === 'error' && (
            <div className='text-sm text-error'>
              Failed to load jobs for this target. Try switching tabs to retry.
            </div>
          )}

          <JobsListView
            filters={filters}
            onFiltersChange={setFilters}
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            refreshKey={refreshKey}
            targetId={activeTargetId}
            analysisTargetId={activeTargetId ?? targets[0]?.id}
            onPostingsLoaded={setVisiblePostings}
          />

          <BatchActionBar
            selectedCount={selectedIds.size}
            onClear={() => setSelectedIds(new Set())}
            onBatchGenerate={handleBatchGenerate}
            onBatchDelete={handleBatchDelete}
            onBatchExport={handleBatchExport}
            generating={generating}
            exporting={exporting}
            hasApproved={visiblePostings.some(
              p => selectedIds.has(p.id) && p.status === 'resume_ready'
            )}
            batchProgress={batchProgress}
          />
        </>
      )}
    </div>
  );
}
