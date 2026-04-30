'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import type { TrendsData } from './types';

interface TrendsChartProps {
  data: TrendsData;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default function TrendsChart({ data }: TrendsChartProps) {
  const chartData = data.series.map(point => ({
    date: formatDate(point.bucketStart),
    score: point.avgOverall,
    scans: point.scanCount,
  }));

  const hasData = chartData.length > 0;

  return (
    <Section aria-labelledby='trends-heading'>
      <Heading variant='section' as='h2' id='trends-heading'>
        Scores Over Time
      </Heading>
      <Text variant='body' className='mt-2 mb-6'>
        {hasData
          ? 'Average overall score across all scans, tracked over time.'
          : 'Trend data will appear after enough scans accumulate.'}
      </Text>

      {hasData && (
        <div
          className='h-72 w-full'
          role='img'
          aria-label='Area chart showing average audit scores over time'
        >
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id='scoreGradient' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='5%' stopColor='#8C8FFF' stopOpacity={0.3} />
                  <stop offset='95%' stopColor='#8C8FFF' stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray='3 3' className='stroke-border' />
              <XAxis dataKey='date' className='fill-muted' />
              <YAxis domain={[0, 100]} className='fill-muted' />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-elevated)',
                  borderColor: 'var(--color-border)',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: 'var(--color-foreground)' }}
                formatter={value => [
                  typeof value === 'number' ? Math.round(value) : 'N/A',
                  'Avg Score',
                ]}
              />
              <Area
                type='monotone'
                dataKey='score'
                stroke='#8C8FFF'
                strokeWidth={2}
                fill='url(#scoreGradient)'
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Section>
  );
}
