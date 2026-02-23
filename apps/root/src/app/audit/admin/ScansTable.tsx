'use client';

import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Stack } from '@danieljoffe.com/shared-ui';

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

  const statusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success' as const;
      case 'failed':
        return 'error' as const;
      case 'running':
        return 'warning' as const;
      default:
        return 'default' as const;
    }
  };

  const gradeVariant = (grade: string | null) => {
    if (!grade) return 'default' as const;
    if (grade === 'A' || grade === 'B') return 'success' as const;
    if (grade === 'C') return 'warning' as const;
    return 'error' as const;
  };

  return (
    <div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-border text-left text-foreground-muted'>
              <th
                className='py-3 px-3 cursor-pointer hover:text-foreground'
                onClick={() => handleSort('created_at')}
              >
                Date{sortIndicator('created_at')}
              </th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-foreground'
                onClick={() => handleSort('url')}
              >
                URL{sortIndicator('url')}
              </th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-foreground'
                onClick={() => handleSort('grade_overall')}
              >
                Grade{sortIndicator('grade_overall')}
              </th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-foreground'
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
                  className='py-8 text-center text-foreground-muted'
                >
                  Loading...
                </td>
              </tr>
            ) : scans.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className='py-8 text-center text-foreground-muted'
                >
                  No scans yet
                </td>
              </tr>
            ) : (
              scans.map(scan => (
                <tr
                  key={scan.id}
                  className='border-b border-border/50 hover:bg-background-elevated cursor-pointer'
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
                      <Badge variant={gradeVariant(scan.grade_overall)}>
                        {scan.grade_overall}
                      </Badge>
                    ) : (
                      <span className='text-foreground-subtle'>-</span>
                    )}
                  </td>
                  <td className='py-3 px-3'>
                    <Badge variant={statusVariant(scan.status)}>
                      {scan.status}
                    </Badge>
                  </td>
                  <td className='py-3 px-3'>
                    {scan.has_lead ? (
                      <span className='text-success'>Yes</span>
                    ) : (
                      <span className='text-foreground-subtle'>No</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Stack
          direction='horizontal'
          justify='between'
          align='center'
          className='mt-4'
        >
          <Button
            variant='outline'
            size='sm'
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
          >
            Previous
          </Button>
          <span className='text-sm text-foreground-muted'>
            Page {page} of {totalPages}
          </span>
          <Button
            variant='outline'
            size='sm'
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </Stack>
      )}
    </div>
  );
}
