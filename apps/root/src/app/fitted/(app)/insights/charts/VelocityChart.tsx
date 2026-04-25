'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { WeeklyCount } from '../types';
import { CHART_COLORS } from './colors';

interface VelocityChartProps {
  data: WeeklyCount[];
}

function formatWeek(value: string) {
  const d = new Date(value);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function VelocityChart({ data }: VelocityChartProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No velocity data yet
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
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip labelFormatter={formatWeek} contentStyle={{ fontSize: 12 }} />
        <Area
          type='monotone'
          dataKey='resumes_generated'
          name='Resumes'
          stackId='1'
          stroke={CHART_COLORS.brand}
          fill={CHART_COLORS.brand}
          fillOpacity={0.3}
        />
        <Area
          type='monotone'
          dataKey='applications_submitted'
          name='Applications'
          stackId='1'
          stroke={CHART_COLORS.success}
          fill={CHART_COLORS.success}
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
