'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CostBucket } from '../types';
import { CHART_COLORS } from './colors';

interface CostChartProps {
  data: CostBucket[];
}

function formatWeek(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCost(value: number) {
  return `$${value.toFixed(2)}`;
}

export default function CostChart({ data }: CostChartProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No cost data yet
      </p>
    );
  }

  return (
    <ResponsiveContainer width='100%' height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.grid} />
        <XAxis
          dataKey='week_start'
          tickFormatter={formatWeek}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          yAxisId='cost'
          tickFormatter={formatCost}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          yAxisId='count'
          orientation='right'
          allowDecimals={false}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          labelFormatter={formatWeek}
          formatter={(value: number, name: string) =>
            name === 'Cost' ? formatCost(value) : value
          }
          contentStyle={{ fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          yAxisId='cost'
          type='monotone'
          dataKey='total_cost'
          name='Cost'
          stroke={CHART_COLORS.warning}
          fill={CHART_COLORS.warning}
          fillOpacity={0.2}
        />
        <Area
          yAxisId='count'
          type='monotone'
          dataKey='resume_count'
          name='Resumes'
          stroke={CHART_COLORS.brand}
          fill={CHART_COLORS.brand}
          fillOpacity={0.15}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
