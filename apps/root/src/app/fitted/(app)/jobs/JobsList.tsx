'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { useToast } from '@/state/Toast/ToastProvider';
import BatchActionBar from './BatchActionBar';
import JobsFilter from './JobsFilter';
import JobsListTable from './JobsListTable';
import type { JobsFilterState } from './types';

const INITIAL_FILTERS: JobsFilterState = {
  minScore: '',
  status: '',
  search: '',
};

const BATCH_POLL_INTERVAL = 3000;

interface JobsListProps {
  targetId: string | undefined;
}

export default function JobsList({ targetId }: JobsListProps) {
  const [filters, setFilters] = useState<JobsFilterState>(INITIAL_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const { toast } = useToast();

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
          contact: {},
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

      const { batch_id } = (await res.json()) as { batch_id: string };

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

          if (batch.status === 'completed' || batch.status === 'failed') {
            clearInterval(pollRef.current);
            pollRef.current = undefined;
            setGenerating(false);
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

  return (
    <div className='flex flex-col gap-6'>
      <Heading variant='component' as='h1'>
        Jobs
      </Heading>

      <JobsFilter filters={filters} onChange={setFilters} />

      <JobsListTable
        filters={filters}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        refreshKey={refreshKey}
        targetId={targetId}
      />

      <BatchActionBar
        selectedCount={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onBatchGenerate={handleBatchGenerate}
        onBatchDelete={handleBatchDelete}
        onBatchExport={handleBatchExport}
        generating={generating}
        exporting={exporting}
        hasApproved={selectedIds.size > 0}
      />
    </div>
  );
}
