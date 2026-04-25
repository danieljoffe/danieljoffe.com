'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { TargetComparison } from '../types';
import { CHART_COLORS } from './colors';

interface TargetComparisonChartProps {
  data: TargetComparison[];
}

export default function TargetComparisonChart({
  data,
}: TargetComparisonChartProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No target data yet
      </p>
    );
  }

  const formatted = data.map(t => ({
    ...t,
    conversion_pct:
      t.conversion_rate !== null ? Math.round(t.conversion_rate * 100) : 0,
  }));

  return (
    <div
      role='img'
      aria-label='Target comparison chart showing average score and conversion rate per target'
    >
      <ResponsiveContainer width='100%' height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.grid} />
          <XAxis dataKey='target_label' tick={{ fontSize: 12 }} />
          <YAxis yAxisId='score' tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId='pct'
            orientation='right'
            tick={{ fontSize: 12 }}
            unit='%'
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId='score'
            dataKey='avg_score'
            name='Avg Score'
            fill={CHART_COLORS.brand}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId='pct'
            dataKey='conversion_pct'
            name='Conversion %'
            fill={CHART_COLORS.success}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
