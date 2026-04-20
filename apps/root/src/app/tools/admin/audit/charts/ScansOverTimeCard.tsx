'use client';

import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import type { TrendsData } from '@/app/(public)/audit/insights/types';

function formatBucket(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ScansOverTimeCard() {
  const [data, setData] = useState<TrendsData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          '/api/audit/insights/trends?interval=weekly&period=3m'
        );
        if (!res.ok) {
          if (!cancelled) setError('Failed to load trend data');
          return;
        }
        const json = (await res.json()) as TrendsData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Failed to load trend data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData =
    data?.series.map(point => ({
      date: formatBucket(point.bucketStart),
      scans: point.scanCount,
    })) ?? [];

  const hasData = chartData.some(point => point.scans > 0);

  return (
    <section
      aria-labelledby='admin-scans-over-time-heading'
      className='rounded-lg border border-border bg-surface-elevated p-4'
    >
      <Heading variant='cardTitle' as='h2' id='admin-scans-over-time-heading'>
        Scans Over Time
      </Heading>
      <Text variant='detail' className='mt-1 mb-4'>
        Weekly scan volume, last 3 months
      </Text>

      {error ? (
        <Text variant='error'>{error}</Text>
      ) : !data ? (
        <div className='h-48 w-full rounded bg-surface animate-pulse' />
      ) : !hasData ? (
        <Text variant='body' className='text-text-secondary'>
          Not enough data yet. Scans will appear here as they accumulate.
        </Text>
      ) : (
        <div
          className='h-48 w-full'
          role='img'
          aria-label='Bar chart showing weekly scan counts over the last three months'
        >
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='date' className='fill-muted' fontSize={12} />
              <YAxis
                className='fill-muted'
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={value => [String(value), 'Scans']}
              />
              <Bar dataKey='scans' fill='#8C8FFF' radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
