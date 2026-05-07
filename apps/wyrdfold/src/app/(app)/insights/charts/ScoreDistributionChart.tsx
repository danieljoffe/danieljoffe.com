'use client';

import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ScoreBucket } from '../types';
import { ChartFigure, type ChartColumn } from './ChartFigure';
import { CHART_AXIS_TICK, CHART_COLORS } from './colors';

interface ScoreDistributionChartProps {
  data: ScoreBucket[];
  unscoredCount?: number;
}

const DRILL_LINK_CLASS =
  'inline-flex items-center rounded-full bg-surface-tertiary px-2 py-0.5 text-xs text-text-primary tabular-nums hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1';

function bucketLow(bucket: string): number {
  return parseInt(bucket.split('-')[0] ?? '0', 10);
}

function bucketColor(bucket: string): string {
  const lo = bucketLow(bucket);
  if (lo >= 70) return CHART_COLORS.success;
  if (lo >= 40) return CHART_COLORS.warning;
  return CHART_COLORS.error;
}

const COLUMNS: ChartColumn<ScoreBucket>[] = [
  { header: 'Score range', render: row => row.bucket },
  { header: 'Jobs', render: row => row.count },
];

export default function ScoreDistributionChart({
  data,
  unscoredCount = 0,
}: ScoreDistributionChartProps) {
  const hasScored = data.length > 0 && data.some(d => d.count > 0);

  if (!hasScored) {
    return (
      <div className='py-8 text-center'>
        <p className='text-sm text-text-secondary'>No scored jobs yet.</p>
        {unscoredCount > 0 && (
          <p className='mt-1 text-sm text-text-secondary'>
            {unscoredCount} {unscoredCount === 1 ? 'job is' : 'jobs are'}{' '}
            waiting to be scored.
          </p>
        )}
      </div>
    );
  }

  const drillBuckets = data.filter(b => b.count > 0);

  return (
    <>
      <ChartFigure
        ariaLabel='Score distribution: job counts by score range'
        rows={data}
        columns={COLUMNS}
        rowKey={row => row.bucket}
      >
        <ResponsiveContainer width='100%' height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.grid} />
            <XAxis
              dataKey='bucket'
              tick={{ ...CHART_AXIS_TICK, fontSize: 11 }}
            />
            <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Bar dataKey='count' name='Jobs' radius={[4, 4, 0, 0]}>
              {data.map(entry => (
                <Cell
                  key={entry.bucket}
                  fill={bucketColor(entry.bucket)}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFigure>
      {drillBuckets.length > 0 && (
        <nav
          aria-label='View jobs by score'
          className='mt-3 flex flex-wrap items-center gap-1.5'
        >
          <span className='text-xs text-text-tertiary'>
            View jobs scoring at least:
          </span>
          {drillBuckets.map(row => (
            <Link
              key={row.bucket}
              href={`/jobs?minScore=${bucketLow(row.bucket)}`}
              className={DRILL_LINK_CLASS}
            >
              {bucketLow(row.bucket)}+ ({row.count})
            </Link>
          ))}
        </nav>
      )}
      {unscoredCount > 0 && (
        <p className='mt-3 text-xs text-text-tertiary'>
          {unscoredCount} {unscoredCount === 1 ? 'job is' : 'jobs are'} waiting
          to be scored — not shown above.
        </p>
      )}
    </>
  );
}
