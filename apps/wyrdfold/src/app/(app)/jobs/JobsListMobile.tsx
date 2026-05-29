'use client';

import { Pagination } from '@danieljoffe.com/shared-ui/Pagination';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { useToast } from '@/state/Toast/ToastProvider';
import JobCard from './JobCard';
import JobsEmptyState from './JobsEmptyState';
import type { JobPosting } from './types';

interface JobsListMobileProps {
  postings: JobPosting[];
  loading: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRefetch: () => void;
}

export default function JobsListMobile({
  postings,
  loading,
  page,
  setPage,
  totalPages,
  selectedIds,
  onSelectionChange,
  onRefetch,
}: JobsListMobileProps) {
  const { toast } = useToast();

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  async function handleDelete(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ variant: 'success', title: 'Job deleted' });
        onRefetch();
      } else {
        toast({ variant: 'error', title: 'Failed to delete job' });
      }
    } catch {
      toast({ variant: 'error', title: 'Failed to delete job' });
    }
  }

  if (loading && postings.length === 0) {
    return (
      <div className='flex flex-col gap-3' aria-label='Loading jobs'>
        {Array.from({ length: 5 }).map((_, i) => (
          // Mirrors the real <JobCard> shape: title row first (with a small
          // status badge to the right), then a meta row with company + score
          // pill. Prior version put meta before title and added a 2-line text
          // body that doesn't exist in JobCard, leaving empty space on swap.
          <div
            key={i}
            className='flex flex-col gap-2 rounded-xl border border-border bg-surface-elevated p-3'
          >
            <div className='flex items-center justify-between gap-2'>
              <Skeleton width='75%' size='md' />
              <Skeleton variant='rectangular' width={48} height={20} />
            </div>
            <div className='flex items-center gap-2'>
              <Skeleton width={110} size='sm' />
              <Skeleton variant='rectangular' width={36} height={20} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (postings.length === 0) {
    return <JobsEmptyState onJobAdded={onRefetch} />;
  }

  return (
    <div className='flex flex-col gap-3'>
      <ul className='flex flex-col gap-3'>
        {postings.map(job => (
          <li key={job.id}>
            <JobCard
              job={job}
              selected={selectedIds.has(job.id)}
              onSelectToggle={() => toggleSelect(job.id)}
              onDelete={() => handleDelete(job.id)}
            />
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className='mt-2 flex justify-center'>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
