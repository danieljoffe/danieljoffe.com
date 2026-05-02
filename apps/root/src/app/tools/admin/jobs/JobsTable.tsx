'use client';

import { Fragment, useMemo, useState } from 'react';
import { Badge } from '@danieljoffe.com/shared-ui/Badge';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Pagination } from '@danieljoffe.com/shared-ui/Pagination';
import { useAdminTableFetch } from '@/hooks/useAdminTableFetch';
import { cn } from '@/lib/cn';
import JobDetail from './JobDetail';
import type { JobPosting, JobsFilterState, JobsSortColumn } from './types';

interface JobsTableProps {
  filters: JobsFilterState;
  refreshKey: number;
}

function ScoreBadge({ score }: { score: number }) {
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'error';
  return <Badge variant={variant}>{score}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'applied'
      ? 'success'
      : status === 'saved'
        ? 'info'
        : status === 'rejected'
          ? 'error'
          : 'default';
  return <Badge variant={variant}>{status}</Badge>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}

export default function JobsTable({ filters, refreshKey }: JobsTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState(0);

  const extraParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.minScore) params.minScore = filters.minScore;
    if (filters.status) params.status = filters.status;
    if (filters.company) params.company = filters.company;
    if (filters.search) params.search = filters.search;
    // refreshKey triggers a refetch when scan completes
    // deleteKey triggers a refetch after a job is deleted
    const combined = refreshKey + deleteKey;
    if (combined) params._r = String(combined);
    return params;
  }, [filters, refreshKey, deleteKey]);

  const {
    data: postings,
    loading,
    page,
    setPage,
    totalPages,
    handleSort,
    sortIndicator,
  } = useAdminTableFetch<JobPosting, JobsSortColumn>({
    endpoint: '/api/jobs',
    defaultSort: 'score',
    pageSize: 20,
    dataKey: 'postings',
    extraParams,
  });

  if (loading && postings.length === 0) {
    return (
      <div className='flex justify-center py-12'>
        <Spinner aria-label='Loading jobs' />
      </div>
    );
  }

  if (postings.length === 0) {
    return (
      <Text variant='body' className='text-center py-12 text-text-tertiary'>
        No jobs found. Try adjusting filters or running a scan.
      </Text>
    );
  }

  return (
    <div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border text-left'>
              {[
                { key: 'score' as JobsSortColumn, label: 'Score' },
                { key: 'title' as JobsSortColumn, label: 'Title' },
                { key: 'company_name' as JobsSortColumn, label: 'Company' },
                { key: 'created_at' as JobsSortColumn, label: 'Date' },
              ].map(col => (
                <th
                  key={col.key}
                  scope='col'
                  className='px-3 py-2 font-medium text-text-secondary cursor-pointer hover:text-text-primary'
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} {sortIndicator(col.key)}
                </th>
              ))}
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
                >
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
                    {timeAgo(job.first_seen_at)}
                  </td>
                  <td className='px-3 py-2'>
                    <StatusBadge status={job.status} />
                  </td>
                  <td className='px-3 py-2 text-text-tertiary truncate max-w-37.5'>
                    {job.location ?? '—'}
                  </td>
                </tr>
                {expandedId === job.id && (
                  <tr>
                    <td colSpan={6} className='p-0'>
                      <JobDetail
                        posting={job}
                        onDelete={() => {
                          setExpandedId(null);
                          setDeleteKey(k => k + 1);
                        }}
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
