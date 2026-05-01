'use client';

import { ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { Dropdown } from '@danieljoffe.com/shared-ui/Dropdown';
import type { DropdownItem } from '@danieljoffe.com/shared-ui/Dropdown';
import { Pagination } from '@danieljoffe.com/shared-ui/Pagination';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { useToast } from '@/state/Toast/ToastProvider';
import JobCard from './JobCard';
import type { JobPosting, JobsSortColumn } from './types';

interface JobsListMobileProps {
  postings: JobPosting[];
  loading: boolean;
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  sort: JobsSortColumn;
  order: 'asc' | 'desc';
  handleSort: (col: JobsSortColumn) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onRefetch: () => void;
}

const SORT_LABEL: Record<JobsSortColumn, string> = {
  score: 'Score',
  title: 'Title',
  company_name: 'Company',
  created_at: 'Posted',
};

const SORT_COLUMNS: JobsSortColumn[] = [
  'score',
  'title',
  'company_name',
  'created_at',
];

export default function JobsListMobile({
  postings,
  loading,
  page,
  setPage,
  totalPages,
  sort,
  order,
  handleSort,
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

  const sortItems: DropdownItem[] = SORT_COLUMNS.map(col => ({
    label: SORT_LABEL[col],
    icon:
      sort === col ? (
        order === 'asc' ? (
          <ArrowUp className='size-4' aria-hidden />
        ) : (
          <ArrowDown className='size-4' aria-hidden />
        )
      ) : undefined,
    onClick: () => handleSort(col),
  }));

  if (loading && postings.length === 0) {
    return (
      <div className='flex flex-col gap-3' aria-label='Loading jobs'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className='flex flex-col gap-2 rounded-xl border border-border bg-surface-elevated p-3'
          >
            <Skeleton width='40%' size='sm' />
            <Skeleton width='80%' size='md' />
            <Skeleton variant='text' lines={2} />
          </div>
        ))}
      </div>
    );
  }

  if (postings.length === 0) {
    return (
      <Text variant='body' className='py-12 text-center text-text-tertiary'>
        No jobs found. Try adjusting filters or adding jobs manually.
      </Text>
    );
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-end'>
        <Dropdown
          trigger={
            <span className='inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-elevated px-3 py-1.5 text-xs text-text-primary'>
              Sort: {SORT_LABEL[sort]} {order === 'asc' ? '↑' : '↓'}
              <ChevronDown className='size-3 text-text-tertiary' aria-hidden />
            </span>
          }
          items={sortItems}
          align='right'
        />
      </div>

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
