'use client';

import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Pagination } from '@danieljoffe.com/shared-ui/Pagination';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { useAdminTableFetch } from '@/hooks/useAdminTableFetch';
import { cn } from '@/lib/cn';
import JobDetailPanel from './JobDetailPanel';
import type { JobPosting, JobsFilterState, JobsSortColumn } from './types';

interface JobsListTableProps {
  filters: JobsFilterState;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  refreshKey: number;
  targetId: string | undefined;
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error';
  return <Badge variant={variant}>{score}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'applied' || status === 'resume_ready'
      ? 'success'
      : status === 'saved' || status === 'resume_draft'
        ? 'info'
        : status === 'interviewing' || status === 'offer'
          ? 'warning'
          : status === 'rejected'
            ? 'error'
            : 'default';
  return <Badge variant={variant}>{status.replace(/_/g, ' ')}</Badge>;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '\u2014';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

const COLUMNS: { key: JobsSortColumn; label: string }[] = [
  { key: 'score', label: 'Score' },
  { key: 'title', label: 'Title' },
  { key: 'company_name', label: 'Company' },
  { key: 'created_at', label: 'Posted' },
];

export default function JobsListTable({
  filters,
  selectedIds,
  onSelectionChange,
  refreshKey,
  targetId,
}: JobsListTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState(0);

  const extraParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (targetId) params.target_id = targetId;
    if (filters.minScore) params.min_score = filters.minScore;
    if (filters.status) params.status = filters.status;
    if (filters.search) params.search = filters.search;
    const combined = refreshKey + deleteKey;
    if (combined) params._r = String(combined);
    return params;
  }, [targetId, filters, refreshKey, deleteKey]);

  const {
    data: postings,
    loading,
    page,
    setPage,
    totalPages,
    sort: activeSort,
    order: sortOrder,
    handleSort,
    sortIndicator,
  } = useAdminTableFetch<JobPosting, JobsSortColumn>({
    endpoint: '/api/jobs',
    defaultSort: 'score',
    pageSize: 20,
    dataKey: 'postings',
    extraParams,
  });

  const allOnPageSelected =
    postings.length > 0 && postings.every(p => selectedIds.has(p.id));

  function toggleSelectAll() {
    const next = new Set(selectedIds);
    if (allOnPageSelected) {
      for (const p of postings) next.delete(p.id);
    } else {
      for (const p of postings) next.add(p.id);
    }
    onSelectionChange(next);
  }

  function toggleSelect(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  }

  if (loading && postings.length === 0) {
    return (
      <div className='space-y-3' aria-label='Loading jobs'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='flex items-center gap-3 px-3 py-2'>
            <Skeleton variant='rectangular' width={40} height={24} />
            <Skeleton width='40%' size='sm' />
            <Skeleton width='20%' size='sm' />
            <Skeleton width='10%' size='sm' />
          </div>
        ))}
      </div>
    );
  }

  if (postings.length === 0) {
    return (
      <Text variant='body' className='text-center py-12 text-text-tertiary'>
        No jobs found. Try adjusting filters or adding jobs manually.
      </Text>
    );
  }

  return (
    <div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm' aria-label='Job postings'>
          <thead>
            <tr className='border-b border-border text-left'>
              <th scope='col' className='px-3 py-2 w-10'>
                <input
                  type='checkbox'
                  checked={allOnPageSelected}
                  onChange={toggleSelectAll}
                  aria-label='Select all on this page'
                  className='accent-brand-500'
                />
              </th>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  scope='col'
                  className='px-3 py-2'
                  aria-sort={
                    activeSort === col.key
                      ? sortOrder === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  }
                >
                  <button
                    type='button'
                    className='flex items-center gap-1 font-medium text-text-secondary hover:text-text-primary'
                    onClick={() => handleSort(col.key)}
                    aria-label={`Sort by ${col.label}`}
                  >
                    {col.label} {sortIndicator(col.key)}
                  </button>
                </th>
              ))}
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Salary
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Status
              </th>
              <th
                scope='col'
                className='px-3 py-2 font-medium text-text-secondary'
              >
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {postings.map(job => (
              <Fragment key={job.id}>
                <tr
                  className={cn(
                    'border-b border-border hover:bg-surface-secondary cursor-pointer transition-colors',
                    expandedId === job.id && 'bg-surface-secondary'
                  )}
                  onClick={() =>
                    setExpandedId(expandedId === job.id ? null : job.id)
                  }
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setExpandedId(expandedId === job.id ? null : job.id);
                    }
                  }}
                  tabIndex={0}
                  role='row'
                  aria-expanded={expandedId === job.id}
                  aria-label={`${job.title} at ${job.company_name}`}
                >
                  <td className='px-3 py-2'>
                    <input
                      type='checkbox'
                      checked={selectedIds.has(job.id)}
                      onChange={() => toggleSelect(job.id)}
                      onClick={e => e.stopPropagation()}
                      aria-label={`Select ${job.title}`}
                      className='accent-brand-500'
                    />
                  </td>
                  <td className='px-3 py-2'>
                    <ScoreBadge score={job.score} />
                  </td>
                  <td className='px-3 py-2 font-medium'>
                    {job.absolute_url ? (
                      <a
                        href={job.absolute_url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-brand-500 hover:text-brand-600'
                        onClick={e => e.stopPropagation()}
                      >
                        {job.title}
                      </a>
                    ) : (
                      job.title
                    )}
                  </td>
                  <td className='px-3 py-2'>{job.company_name}</td>
                  <td className='px-3 py-2 text-text-tertiary'>
                    {timeAgo(job.greenhouse_updated_at ?? job.first_seen_at)}
                  </td>
                  <td className='px-3 py-2 text-text-tertiary'>
                    {job.salary_text ?? '\u2014'}
                  </td>
                  <td className='px-3 py-2'>
                    <StatusBadge status={job.status} />
                  </td>
                  <td className='px-3 py-2 text-text-tertiary truncate max-w-[150px]'>
                    {job.location ?? '\u2014'}
                  </td>
                </tr>
                {expandedId === job.id && (
                  <tr>
                    <td colSpan={8} className='p-0'>
                      <JobDetailPanel
                        posting={job}
                        onDelete={() => {
                          setExpandedId(null);
                          setDeleteKey(k => k + 1);
                        }}
                        onStatusChange={() => setDeleteKey(k => k + 1)}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className='mt-4 flex justify-center'>
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
