'use client';

import { Pagination, Spinner } from '@/components/kit';
import { badgeVariants } from '@/lib/badgeStyles';
import { formatDate } from '@/lib/dateFormatting';
import { useAdminTableFetch } from '@/hooks/useAdminTableFetch';

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

const statusStyles: Record<string, string> = {
  completed: badgeVariants.success,
  failed: badgeVariants.error,
  running: badgeVariants.warning,
  default: badgeVariants.default,
};

export default function ScansTable({ password }: ScansTableProps) {
  const {
    data: scans,
    loading,
    page,
    setPage,
    totalPages,
    handleSort,
    sortIndicator,
  } = useAdminTableFetch<AdminScan, SortColumn>({
    endpoint: '/api/audit/admin/scans',
    password,
    defaultSort: 'created_at',
    dataKey: 'scans',
  });

  const getStatusStyle = (status: string) =>
    statusStyles[status] || statusStyles.default;

  const getGradeStyle = (grade: string | null) => {
    if (!grade) return badgeVariants.default;
    if (grade === 'A' || grade === 'B') return badgeVariants.success;
    if (grade === 'C') return badgeVariants.warning;
    return badgeVariants.error;
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
                <td colSpan={5} className='py-8 text-center'>
                  <Spinner label='Loading scans' />
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
                    {formatDate(scan.created_at)}
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

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        namePrefix='scans'
      />
    </div>
  );
}
