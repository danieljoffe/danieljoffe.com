'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import type { LeadSourcesResponse } from '@/app/api/audit/admin/leads/sources/route';

function formatSourceLabel(source: string): string {
  return source
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function LeadSourcesCard() {
  const [data, setData] = useState<LeadSourcesResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/audit/admin/leads/sources');
        if (!res.ok) {
          if (!cancelled) setError('Failed to load lead sources');
          return;
        }
        const json = (await res.json()) as LeadSourcesResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Failed to load lead sources');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(
    () =>
      data?.sources.map(entry => ({
        source: formatSourceLabel(entry.source),
        count: entry.count,
      })) ?? [],
    [data]
  );

  const hasData = (data?.total ?? 0) > 0 && chartData.length > 0;

  const chartLabel = useMemo(() => {
    if (!hasData) return '';
    const parts = chartData.map(({ source, count }) => `${source}: ${count}`);
    return `Lead counts by source. ${parts.join(', ')}.`;
  }, [chartData, hasData]);

  return (
    <section
      aria-labelledby='admin-lead-sources-heading'
      className='rounded-lg border border-border bg-surface-elevated p-4'
    >
      <Heading variant='cardTitle' as='h2' id='admin-lead-sources-heading'>
        Lead Sources
      </Heading>
      <Text variant='detail' className='mt-1 mb-4'>
        {hasData
          ? `Where ${(data?.total ?? 0).toLocaleString()} captured leads came from`
          : 'Where captured leads come from'}
      </Text>

      {error ? (
        <Text variant='error' role='alert'>
          {error}
        </Text>
      ) : !data ? (
        <div
          role='status'
          aria-label='Loading lead sources'
          className='h-48 w-full rounded bg-surface animate-pulse'
        />
      ) : !hasData ? (
        <Text variant='body' className='text-text-secondary'>
          No leads captured yet.
        </Text>
      ) : (
        <div className='h-48 w-full' role='img' aria-label={chartLabel}>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData} layout='vertical'>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis
                type='number'
                className='fill-muted'
                fontSize={12}
                allowDecimals={false}
              />
              <YAxis
                type='category'
                dataKey='source'
                className='fill-muted'
                fontSize={12}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={value => [String(value), 'Leads']}
              />
              <Bar dataKey='count' fill='#63CAA5' radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
