'use client';

import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Metric {
  label: string;
  before: string;
  after: string;
  improvement: string;
}

interface MetricsDashboardProps {
  metrics: Metric[];
}

function isPositive(improvement: string): boolean {
  // Treat reductions, "faster", decreases as positive improvements
  const lower = improvement.toLowerCase();
  return (
    lower.includes('faster') ||
    lower.includes('reduction') ||
    lower.includes('increase') ||
    lower.includes('improvement') ||
    lower.includes('+') ||
    lower.includes('×') ||
    lower.includes('x') ||
    /\d+%/.test(lower)
  );
}

function MetricCard({ label, before, after, improvement }: Metric) {
  const positive = isPositive(improvement);

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-surface-secondary p-4',
        'flex flex-col gap-3'
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <span className='text-xs font-medium text-text-secondary'>{label}</span>
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
            positive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}
        >
          {positive ? (
            <TrendingUp className='h-3 w-3' />
          ) : (
            <TrendingDown className='h-3 w-3' />
          )}
          {improvement}
        </span>
      </div>

      <div className='flex items-end gap-4'>
        <div className='flex-1'>
          <p className='mb-1 text-[10px] uppercase tracking-wider text-text-tertiary'>
            Before
          </p>
          <p className='text-lg font-semibold text-text-primary'>{before}</p>
        </div>
        <div className='text-text-tertiary'>→</div>
        <div className='flex-1'>
          <p className='mb-1 text-[10px] uppercase tracking-wider text-text-tertiary'>
            After
          </p>
          <p className='text-lg font-semibold text-brand-500'>{after}</p>
        </div>
      </div>
    </div>
  );
}

export function MetricsDashboard({ metrics }: MetricsDashboardProps) {
  return (
    <div
      className='my-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'
      role='region'
      aria-label='Performance metrics comparison'
    >
      {metrics.map(metric => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </div>
  );
}
