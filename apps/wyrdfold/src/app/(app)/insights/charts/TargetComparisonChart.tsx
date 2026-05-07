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
import { ChartFigure, type ChartColumn } from './ChartFigure';
import { CHART_AXIS_TICK, CHART_COLORS } from './colors';

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

  const columns: ChartColumn<(typeof formatted)[number]>[] = [
    { header: 'Target', render: row => row.target_label },
    { header: 'Avg score', render: row => row.avg_score },
    { header: 'Conversion %', render: row => `${row.conversion_pct}%` },
  ];

  return (
    <ChartFigure
      ariaLabel='Target comparison: average score and conversion rate per target'
      rows={formatted}
      columns={columns}
      rowKey={row => row.target_id}
    >
      <ResponsiveContainer width='100%' height={250}>
        <BarChart data={formatted}>
          <CartesianGrid strokeDasharray='3 3' stroke={CHART_COLORS.grid} />
          <XAxis dataKey='target_label' tick={CHART_AXIS_TICK} />
          <YAxis yAxisId='score' tick={CHART_AXIS_TICK} />
          <YAxis
            yAxisId='pct'
            orientation='right'
            tick={CHART_AXIS_TICK}
            unit='%'
          />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value, name) => {
              if (name === 'Avg Score') return [String(value), name];
              if (name === 'Conversion %') return [`${value}%`, name];
              return null;
            }}
          />
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
    </ChartFigure>
  );
}
