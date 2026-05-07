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
import type { WeeklyCount } from '../types';
import { ChartFigure, type ChartColumn } from './ChartFigure';
import { CHART_AXIS_TICK, CHART_COLORS } from './colors';
import { formatWeek } from './format';

interface VelocityChartProps {
  data: WeeklyCount[];
}

const COLUMNS: ChartColumn<WeeklyCount>[] = [
  { header: 'Week', render: row => formatWeek(row.week_start) },
  { header: 'Resumes', render: row => row.resumes_generated },
  { header: 'Applications', render: row => row.applications_submitted },
];

export default function VelocityChart({ data }: VelocityChartProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No velocity data yet
      </p>
    );
  }

  return (
    <ChartFigure
      ariaLabel='Weekly activity: resumes generated and applications submitted per week'
      rows={data}
      columns={COLUMNS}
      rowKey={row => row.week_start}
    >
      <ResponsiveContainer width='100%' height={250}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.grid} />
          <XAxis
            dataKey='week_start'
            tickFormatter={formatWeek}
            tick={CHART_AXIS_TICK}
          />
          <YAxis allowDecimals={false} tick={CHART_AXIS_TICK} />
          <Tooltip
            labelFormatter={label => formatWeek(String(label))}
            contentStyle={{ fontSize: 12 }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
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
    </ChartFigure>
  );
}
