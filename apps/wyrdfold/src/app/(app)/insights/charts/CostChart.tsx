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
import { ChartFigure, type ChartColumn } from './ChartFigure';
import { CHART_AXIS_TICK, CHART_COLORS } from './colors';
import { formatCost, formatWeek } from './format';

interface CostChartProps {
  data: CostBucket[];
}

const COLUMNS: ChartColumn<CostBucket>[] = [
  { header: 'Week', render: row => formatWeek(row.week_start) },
  { header: 'Cost', render: row => formatCost(row.total_cost) },
  { header: 'Resumes', render: row => row.resume_count },
];

export default function CostChart({ data }: CostChartProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No cost data yet
      </p>
    );
  }

  return (
    <ChartFigure
      ariaLabel='LLM cost: weekly spend and resume count'
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
          <YAxis
            yAxisId='cost'
            tickFormatter={formatCost}
            tick={CHART_AXIS_TICK}
          />
          <YAxis
            yAxisId='count'
            orientation='right'
            allowDecimals={false}
            tick={CHART_AXIS_TICK}
          />
          <Tooltip
            labelFormatter={label => formatWeek(String(label))}
            formatter={(value, name) =>
              name === 'Cost' ? formatCost(Number(value)) : String(value)
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
    </ChartFigure>
  );
}
