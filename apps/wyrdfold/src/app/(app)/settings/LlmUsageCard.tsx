'use client';

import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe/shared-ui/Card';
import { Skeleton } from '@danieljoffe/shared-ui/Skeleton';
import { Text } from '@danieljoffe/shared-ui/Text';

interface UsageWindow {
  spent_usd: number;
  limit_usd: number;
}

interface LlmUsage {
  hourly: UsageWindow;
  daily: UsageWindow;
  monthly: UsageWindow;
  monthly_resets_at: string | null;
  analysis_daily_used: number;
  analysis_daily_limit: number;
}

function UsageBar({ spent, limit }: { spent: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  return (
    <div
      className='h-2 w-full overflow-hidden rounded-full bg-surface-tertiary'
      role='progressbar'
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label='Monthly allowance used'
    >
      <div
        className={
          pct >= 90
            ? 'h-full rounded-full bg-error'
            : pct >= 70
              ? 'h-full rounded-full bg-warning'
              : 'h-full rounded-full bg-brand-500'
        }
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function LlmUsageCard() {
  const [usage, setUsage] = useState<LlmUsage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/profile/llm-usage');
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as LlmUsage;
        if (!cancelled) setUsage(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Gauge className='size-4' aria-hidden />
          AI usage
        </CardTitle>
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {failed ? (
          <Text variant='caption' className='text-text-secondary'>
            Usage data is unavailable right now.
          </Text>
        ) : usage === null ? (
          <div className='flex flex-col gap-2' aria-label='Loading usage'>
            <Skeleton width='40%' size='sm' />
            <Skeleton variant='rectangular' height={8} />
          </div>
        ) : (
          <>
            <div className='flex items-baseline justify-between'>
              <Text variant='caption' className='text-text-secondary'>
                Monthly allowance
              </Text>
              <Text variant='caption'>
                ${usage.monthly.spent_usd.toFixed(2)} of $
                {usage.monthly.limit_usd.toFixed(2)}
              </Text>
            </div>
            <UsageBar
              spent={usage.monthly.spent_usd}
              limit={usage.monthly.limit_usd}
            />
            <div className='flex items-baseline justify-between'>
              <Text variant='caption' className='text-text-secondary'>
                Deep analyses today
              </Text>
              <Text variant='caption'>
                {usage.analysis_daily_used} of {usage.analysis_daily_limit}
              </Text>
            </div>
            {usage.monthly_resets_at && (
              <Text variant='caption' className='text-text-tertiary'>
                Allowance frees up around{' '}
                {new Date(usage.monthly_resets_at).toLocaleDateString()} as
                usage rolls out of the 30-day window.
              </Text>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
