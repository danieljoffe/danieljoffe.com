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
  Cell,
} from 'recharts';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import type { ScoresData } from '@/app/(public)/audit/insights/types';

const GRADE_COLORS: Record<string, string> = {
  A: '#63CAA5',
  B: '#8C8FFF',
  C: '#FFB46B',
  D: '#FF8CA0',
  F: '#FF6B6B',
};

export default function ScoreDistributionCard() {
  const [data, setData] = useState<ScoresData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/audit/insights/scores');
        if (!res.ok) {
          if (!cancelled) setError('Failed to load score data');
          return;
        }
        const json = (await res.json()) as ScoresData;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError('Failed to load score data');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = useMemo(
    () =>
      data
        ? Object.entries(data.gradeDistribution).map(([grade, count]) => ({
            grade,
            count,
          }))
        : [],
    [data]
  );

  const hasData = (data?.total ?? 0) > 0;

  const chartLabel = useMemo(() => {
    if (!hasData) return '';
    const parts = chartData.map(({ grade, count }) => `${grade}: ${count}`);
    return `Grade distribution across ${(data?.total ?? 0).toLocaleString()} completed scans. ${parts.join(', ')}.`;
  }, [chartData, hasData, data]);

  return (
    <section
      aria-labelledby='admin-score-dist-heading'
      className='rounded-lg border border-border bg-surface-elevated p-4'
    >
      <Heading variant='cardTitle' as='h2' id='admin-score-dist-heading'>
        Score Distribution
      </Heading>
      <Text variant='detail' className='mt-1 mb-4'>
        {hasData
          ? `Grades across ${(data?.total ?? 0).toLocaleString()} completed scans`
          : 'Grades across completed scans'}
      </Text>

      {error ? (
        <Text variant='error' role='alert'>
          {error}
        </Text>
      ) : !data ? (
        <div
          role='status'
          aria-label='Loading score distribution'
          className='h-48 w-full rounded bg-surface animate-pulse'
        />
      ) : !hasData ? (
        <Text variant='body' className='text-text-secondary'>
          Not enough data yet. Grades will appear as scans complete.
        </Text>
      ) : (
        <div className='h-48 w-full' role='img' aria-label={chartLabel}>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='grade' className='fill-muted' fontSize={12} />
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
                labelFormatter={label => `Grade ${label}`}
                formatter={value => [String(value), 'Sites']}
              />
              <Bar dataKey='count' radius={[4, 4, 0, 0]}>
                {chartData.map(entry => (
                  <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
