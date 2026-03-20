'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/state/Toast/ToastProvider';

interface AdminLead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  url_scanned: string | null;
  source: string;
  created_at: string;
  email_sequence_step: number;
}

interface LeadsTableProps {
  password: string;
}

type SortColumn = 'created_at' | 'email' | 'source' | 'email_sequence_step';

const badgeBase =
  'inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium';

export default function LeadsTable({ password }: LeadsTableProps) {
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sort, setSort] = useState<SortColumn>('created_at');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        order,
      });
      const res = await fetch(`/api/audit/admin/leads?${params}`, {
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        const data = await res.json();
        setLeads(data.leads);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [password, page, pageSize, sort, order]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  function handleSort(column: SortColumn) {
    if (sort === column) {
      setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(column);
      setOrder('desc');
    }
    setPage(1);
  }

  async function copyEmail(id: string, email: string) {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({ variant: 'success', title: 'Email copied to clipboard!' });
    } catch {
      toast({ variant: 'error', title: 'Failed to copy email' });
    }
  }

  const totalPages = Math.ceil(total / pageSize);
  const sortIndicator = (col: SortColumn) =>
    sort === col ? (order === 'asc' ? ' \u2191' : ' \u2193') : '';

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
                onClick={() => handleSort('email')}
              >
                Email{sortIndicator('email')}
              </th>
              <th className='py-3 px-3'>Name</th>
              <th className='py-3 px-3'>Company</th>
              <th className='py-3 px-3'>URL Scanned</th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-text-primary'
                onClick={() => handleSort('source')}
              >
                Source{sortIndicator('source')}
              </th>
              <th
                className='py-3 px-3 cursor-pointer hover:text-text-primary'
                onClick={() => handleSort('email_sequence_step')}
              >
                Email Step{sortIndicator('email_sequence_step')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className='py-8 text-center text-text-secondary'
                >
                  Loading...
                </td>
              </tr>
            ) : leads.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className='py-8 text-center text-text-secondary'
                >
                  No leads yet
                </td>
              </tr>
            ) : (
              leads.map(lead => (
                <tr
                  key={lead.id}
                  className='border-b border-border/50 hover:bg-surface-elevated'
                >
                  <td className='py-3 px-3 whitespace-nowrap'>
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className='py-3 px-3'>
                    <button
                      className='text-brand-500 hover:underline cursor-pointer'
                      onClick={() => copyEmail(lead.id, lead.email)}
                      title='Click to copy'
                    >
                      {copiedId === lead.id ? 'Copied!' : lead.email}
                    </button>
                  </td>
                  <td className='py-3 px-3'>
                    {lead.name ?? <span className='text-text-tertiary'>-</span>}
                  </td>
                  <td className='py-3 px-3'>
                    {lead.company ?? (
                      <span className='text-text-tertiary'>-</span>
                    )}
                  </td>
                  <td className='py-3 px-3 max-w-[200px] truncate'>
                    {lead.url_scanned ?? (
                      <span className='text-text-tertiary'>-</span>
                    )}
                  </td>
                  <td className='py-3 px-3'>
                    <span
                      className={`${badgeBase} bg-surface-elevated text-text-secondary border border-border`}
                    >
                      {lead.source}
                    </span>
                  </td>
                  <td className='py-3 px-3 text-center'>
                    {lead.email_sequence_step}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className='flex flex-row justify-between items-center mt-4'>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className='inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer border border-border-secondary text-text-primary hover:bg-surface-elevated px-3 py-1.5 text-sm'
          >
            Previous
          </button>
          <span className='text-sm text-text-secondary'>
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className='inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer border border-border-secondary text-text-primary hover:bg-surface-elevated px-3 py-1.5 text-sm'
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
