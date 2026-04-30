'use client';

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
import { CHART_COLORS } from './colors';

interface ScoreDistributionChartProps {
  data: ScoreBucket[];
}

function bucketColor(bucket: string): string {
  const lo = parseInt(bucket.split('-')[0] ?? '0', 10);
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
}: ScoreDistributionChartProps) {
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No score data yet
      </p>
    );
  }

  return (
    <ChartFigure
      ariaLabel='Score distribution: job counts by score range'
      rows={data}
      columns={COLUMNS}
      rowKey={row => row.bucket}
    >
      <ResponsiveContainer width='100%' height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.grid} />
          <XAxis dataKey='bucket' tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
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
  );
}
