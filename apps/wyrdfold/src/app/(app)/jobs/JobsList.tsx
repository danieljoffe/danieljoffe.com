'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card, CardContent } from '@danieljoffe.com/shared-ui/Card';
import Button from '@/components/Button';
import { extractApiError } from '@/lib/extractApiError';
import { useToast } from '@/state/Toast/ToastProvider';
import { cn } from '@/lib/cn';
import BatchActionBar from './BatchActionBar';
import JobsListView from './JobsListView';
import JobsThinResultsCallout from './JobsThinResultsCallout';
import { promptForMissingContactName } from './promptForMissingContactName';
import type { JobPosting, JobsFilterState, JobsSortColumn } from './types';
import { useJobsUrlState } from './useJobsUrlState';

export interface TargetTab {
  id: string;
  label: string;
}

const BATCH_POLL_INTERVAL = 3000;

interface JobsListProps {
  targetId: string | undefined;
  initialStatus?: string;
  initialMinScore?: string;
  initialTargets: TargetTab[];
}

export default function JobsList({
  targetId,
  initialStatus,
  initialMinScore,
  initialTargets,
}: JobsListProps) {
  // Single source of truth for filters / sort / page / target — backed by
  // URL query params so browser back/forward restores every dimension of
  // the page state. The ``initialStatus`` and ``initialMinScore`` props
  // were the previous server-side prelude to this state; they're now
  // strictly fallbacks for the (rare) case where the URL has no params
  // (e.g. server-side prerender before client hydration).
  // Default to All Jobs (undefined targetId) when no `?target=X` is in the
  // URL. Previously this fell through to ``initialTargets[0]`` which made
  // the first active target sticky as the "default tab"; users with
  // multiple targets kept landing on a per-target view they didn't pick.
  const defaultTargetId = targetId;
  const { state: urlState, setState: setUrlState } = useJobsUrlState({
    defaultSort: 'score',
    defaultOrder: 'desc',
    defaultTargetId,
  });

  // Derived filter view for the existing JobsFilter component — keeps that
  // component oblivious to the URL plumbing. Falls back to the server-side
  // ``initialStatus`` / ``initialMinScore`` props only when the URL has no
  // value for that key, so a deep-linked ``/jobs?status=applied`` URL still
  // pins the filter on the first client render.
  const filters: JobsFilterState = useMemo(
    () => ({
      search: urlState.search,
      status: urlState.status || initialStatus || '',
      minScore: urlState.minScore || initialMinScore || '',
      excludeLocations: urlState.excludeLocations,
      onlyLocations: urlState.onlyLocations,
    }),
    [
      urlState.search,
      urlState.status,
      urlState.minScore,
      urlState.excludeLocations,
      urlState.onlyLocations,
      initialStatus,
      initialMinScore,
    ]
  );

  const setFilters = useCallback(
    (next: JobsFilterState) => {
      setUrlState({
        search: next.search || null,
        status: next.status || null,
        minScore: next.minScore || null,
        excludeLocations: next.excludeLocations || null,
        onlyLocations: next.onlyLocations || null,
        // Filter changes always reset to page 1 — match
        // ``useAdminTableFetch``'s ``extraParams`` reset.
        page: 1,
      });
    },
    [setUrlState]
  );

  const activeTargetId = urlState.targetId;

  // Sort/order/page wiring for ``useAdminTableFetch``. Defined here so we
  // can hand them down to JobsListView as a controlled trio + change
  // callbacks. Sort defaults are mirrored from ``useJobsUrlState`` so the
  // values match.
  const controlledTableState = useMemo(
    () => ({
      sort: urlState.sort as JobsSortColumn,
      order: urlState.order,
      page: urlState.page,
    }),
    [urlState.sort, urlState.order, urlState.page]
  );

  const onTableSortChange = useCallback(
    (sort: JobsSortColumn, order: 'asc' | 'desc') => {
      // Sort changes reset to page 1 and create a history entry so back
      // restores the old sort.
      setUrlState({ sort, order, page: 1 }, 'push');
    },
    [setUrlState]
  );

  const onTablePageChange = useCallback(
    (page: number) => {
      // Page changes create history entries so the back button works.
      setUrlState({ page }, 'push');
    },
    [setUrlState]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState<
    { completed: number; total: number } | undefined
  >(undefined);
  const [exporting, setExporting] = useState(false);
  const [visiblePostings, setVisiblePostings] = useState<JobPosting[]>([]);
  const [activationStatus, setActivationStatus] = useState<string>('idle');
  // Total job count for the active target, sourced from
  // ``/api/targets/{id}/status``. Drives the thin-results CTA. Reset
  // on tab switch so a fresh target doesn't briefly show the previous
  // target's count.
  const [jobsCount, setJobsCount] = useState<number | null>(null);
  const activatingRef = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const { toast } = useToast();

  const targets = initialTargets;

  // Check target activation status when switching tabs
  useEffect(() => {
    if (!activeTargetId) return;

    let cancelled = false;
    const statusPollRef: {
      current: ReturnType<typeof setInterval> | undefined;
    } = { current: undefined };

    function clearStatusPoll() {
      if (statusPollRef.current) {
        clearInterval(statusPollRef.current);
        // Null out the ref so a later branch that gates on
        // ``!statusPollRef.current`` can re-establish polling.
        // Previously the cleared timer ID lingered, so going
        // ready → deriving → ready never re-established polling
        // on the second cycle.
        statusPollRef.current = undefined;
      }
    }

    function ensureStatusPoll() {
      if (!statusPollRef.current) {
        statusPollRef.current = setInterval(checkStatus, 3000);
      }
    }

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
        setJobsCount(data.jobs_count);

        if (data.activation_status === 'ready') {
          // Jobs are ready — refresh the table
          clearStatusPoll();
          setRefreshKey(k => k + 1);
        } else if (data.activation_status === 'idle') {
          // Only POST /activate once per session per target;
          // activatingRef tracks which ones we've already kicked off.
          // But always ensure polling is running — without this the
          // user could land on a target whose ref says "already
          // activated" but whose status hasn't progressed, and the
          // UI would silently get stuck on 'idle' forever.
          if (!activatingRef.current.has(activeTargetId!)) {
            activatingRef.current.add(activeTargetId!);
            await fetch(`/api/targets/${activeTargetId}/activate`, {
              method: 'POST',
            });
            // Navigation away during the POST shouldn't leave a
            // no-op poller attached to a cancelled effect.
            if (cancelled) return;
          }
          ensureStatusPoll();
        } else if (
          data.activation_status === 'deriving' ||
          data.activation_status === 'polling'
        ) {
          // Pipeline in progress — keep polling
          ensureStatusPoll();
        } else if (data.activation_status === 'error') {
          clearStatusPoll();
        }
      } catch {
        // Non-critical — will retry on next interval or tab switch
      }
    }

    checkStatus();

    return () => {
      cancelled = true;
      clearStatusPoll();
    };
  }, [activeTargetId]);

  const handleTabChange = useCallback(
    (id: string | undefined) => {
      setActivationStatus('idle');
      setJobsCount(null);
      setSelectedIds(new Set());
      // Tab change resets all filters AND the page, then writes the new
      // target to the URL with ``push`` so the back button restores the
      // previous tab.
      setUrlState(
        {
          targetId: id ?? null,
          search: null,
          status: null,
          minScore: null,
          excludeLocations: null,
          onlyLocations: null,
          page: 1,
        },
        'push'
      );
    },
    [setUrlState]
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
      const postBatch = () =>
        fetch('/api/jobs/tailor/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_posting_ids: [...selectedIds],
          }),
        });

      let res = await postBatch();

      // The synchronous batch POST hits the same ``resolve_contact``
      // gate as the single-job tailor routes — a user who skipped
      // the onboarding identity step (#703) and clicks batch-generate
      // would otherwise dead-end on "No contact name on file".
      // Mirrors the inline-prompt + retry pattern from
      // ResumeSection / CoverLetterSection.
      if (!res.ok) {
        const peek = (await res
          .clone()
          .json()
          .catch(() => null)) as { detail?: unknown } | null;
        const detailString =
          typeof peek?.detail === 'string' ? peek.detail : undefined;
        if (await promptForMissingContactName(detailString)) {
          res = await postBatch();
        }
      }

      if (!res.ok) {
        // ``extractApiError`` understands the structured
        // ``llm_budget_exceeded`` 429 detail (PR #701) and plain-
        // string details (404 missing optimized doc, missing job).
        // The previous ad-hoc ``err.detail`` parser cast a possibly-
        // object detail to ``Record<string, string>``, so budget-
        // exceeded errors rendered as the generic fallback instead
        // of the actionable "$X of $Y, try again in an hour"
        // message.
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Batch generation failed'),
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
        // ``/tailor/export-zip`` surfaces actionable detail (e.g.,
        // ``"resumes not yet approved: id1, id2"``) — without
        // ``extractApiError`` the user just saw "Export failed" and
        // had to guess which selected resume was the holdup.
        toast({
          variant: 'error',
          title: await extractApiError(res, 'Export failed'),
        });
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

      {targets.length === 0 ? (
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
          {/* Toggle-button group rather than role='tablist'. Tabs require
              Left/Right/Home/End keyboard nav + aria-controls / tabpanel
              linkage per WAI-ARIA APG; we don't need either since the
              "panel" is the rest of the page. aria-pressed gives SR
              users the same selected-state announcement as aria-selected
              would. (Phase 5 A11y P2.) */}
          <div className='border-b border-border'>
            <div
              role='group'
              aria-label='Filter jobs by target'
              className='flex gap-1 overflow-x-auto'
            >
              <button
                type='button'
                aria-pressed={activeTargetId === undefined}
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
                  type='button'
                  key={target.id}
                  aria-pressed={activeTargetId === target.id}
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
            controlledTableState={controlledTableState}
            onTableSortChange={onTableSortChange}
            onTablePageChange={onTablePageChange}
          />

          {/* Thin-results CTA. Empty state (0 jobs) is owned by
              JobsEmptyState inside JobsListTable / JobsListMobile;
              this one fires in the 1–4 range to keep the user from
              staring at a sparse list with no path to add more.
              Only shows once activation is in the ``ready`` state —
              while deriving / polling, the count is still settling
              and a "you have few jobs" affordance would be premature. */}
          {activeTargetId &&
            activationStatus === 'ready' &&
            jobsCount !== null &&
            jobsCount > 0 &&
            jobsCount < 5 && (
              <JobsThinResultsCallout
                jobsCount={jobsCount}
                targetLabel={
                  targets.find(t => t.id === activeTargetId)?.label ??
                  'this target'
                }
                onJobAdded={() => setRefreshKey(k => k + 1)}
              />
            )}

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
