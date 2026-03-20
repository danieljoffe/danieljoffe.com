'use client';

import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/Button';

interface AdminScan {
  id: string;
  url: string;
  status: string;
  grade_overall: string | null;
  created_at: string;
  score_performance: number | null;
  score_accessibility: number | null;
  score_seo: number | null;
  score_best_practices: number | null;
  has_lead: boolean;
}

interface ScansTableProps {
  password: string;
}

type SortColumn =
  | 'created_at'
  | 'url'
  | 'status'
  | 'grade_overall'
  | 'score_performance';

const badgeBase =
  'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium';

const statusStyles: Record<string, string> = {
  completed: `${badgeBase} bg-success-light text-success border border-success/30`,
  failed: `${badgeBase} bg-error-light text-error border border-error/30`,
  running: `${badgeBase} bg-warning-light text-warning border border-warning/30`,
  default: `${badgeBase} bg-surface-elevated text-text-secondary border border-border`,
};

const gradeStyles: Record<string, string> = {
  success: `${badgeBase} bg-success-light text-success border border-success/30`,
  warning: `${badgeBase} bg-warning-light text-warning border border-warning/30`,
  error: `${badgeBase} bg-error-light text-error border border-error/30`,
  default: `${badgeBase} bg-surface-elevated text-text-secondary border border-border`,
};

export default function ScansTable({ password }: ScansTableProps) {
  const [scans, setScans] = useState<AdminScan[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState<SortColumn>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);

  const fetchScans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        order,
      });
      const res = await fetch(`/api/audit/admin/scans?${params}`, {
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [password, page, pageSize, sort, order]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  function handleSort(column: SortColumn) {
    if (sort === column) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(column);
      setOrder('desc');
    }
    setPage(1);
  }

  const totalPages = Math.ceil(total / pageSize);
  const sortIndicator = (col: SortColumn) =>
    sort === col ? (order === 'asc' ? ' \u2191' : ' \u2193') : '';

  const getStatusStyle = (status: string) =>
    statusStyles[status] || statusStyles.default;

  const getGradeStyle = (grade: string | null) => {
    if (!grade) return gradeStyles.default;
    if (grade === 'A' || grade === 'B') return gradeStyles.success;
    if (grade === 'C') return gradeStyles.warning;
    return gradeStyles.error;
  };

  return (
    <div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border text-left text-text-secondary'>
              <th
                className='py-3 px-3 cursor-pointer hover:text-text-primary'
                onClick={() => handleSort('created_at')}
              >
                Date{sortIndicator('created_at')}
              </th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-text-primary'
                onClick={() => handleSort('url')}
              >
                URL{sortIndicator('url')}
              </th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-text-primary'
                onClick={() => handleSort('grade_overall')}
              >
                Grade{sortIndicator('grade_overall')}
              </th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-text-primary'
                onClick={() => handleSort('status')}
              >
                Status{sortIndicator('status')}
              </th>
              <th className='py-3 px-3'>Lead?</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className='py-8 text-center text-text-secondary'
                >
                  Loading...
                </td>
              </tr>
            ) : scans.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className='py-8 text-center text-text-secondary'
                >
                  No scans yet
                </td>
              </tr>
            ) : (
              scans.map(scan => (
                <tr
                  key={scan.id}
                  className='border-b border-border/50 hover:bg-surface-elevated cursor-pointer'
                  onClick={() => window.open(`/audit/r/${scan.id}`, '_blank')}
                >
                  <td className='py-3 px-3 whitespace-nowrap'>
                    {new Date(scan.created_at).toLocaleDateString()}
                  </td>
                  <td className='py-3 px-3 max-w-[200px] truncate'>
                    {scan.url}
                  </td>
                  <td className='py-3 px-3'>
                    {scan.grade_overall ? (
                      <span className={getGradeStyle(scan.grade_overall)}>
                        {scan.grade_overall}
                      </span>
                    ) : (
                      <span className='text-text-tertiary'>-</span>
                    )}
                  </td>
                  <td className='py-3 px-3'>
                    <span className={getStatusStyle(scan.status)}>
                      {scan.status}
                    </span>
                  </td>
                  <td className='py-3 px-3'>
                    {scan.has_lead ? (
                      <span className='text-success'>Yes</span>
                    ) : (
                      <span className='text-text-tertiary'>No</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className='flex flex-row justify-between items-center mt-4'>
          <Button
            variant='outline'
            size='sm'
            name='scans-previous-page'
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className='text-sm text-text-secondary'>
            Page {page} of {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            name='scans-next-page'
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
