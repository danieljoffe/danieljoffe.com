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
import type { FunnelStage } from '../types';
import { ChartFigure, type ChartColumn } from './ChartFigure';
import { CHART_COLORS } from './colors';

interface FunnelChartProps {
  data: FunnelStage[];
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  saved: 'Saved',
  resume_draft: 'Draft',
  resume_ready: 'Ready',
  applied: 'Applied',
  interviewing: 'Interview',
  offer: 'Offer',
};

function formatLabel(slug: string): string {
  return slug
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/** Gradient from brand → success across the funnel. */
const STAGE_COLORS = [
  CHART_COLORS.brand,
  CHART_COLORS.brand,
  CHART_COLORS.info,
  CHART_COLORS.info,
  CHART_COLORS.warning,
  CHART_COLORS.success,
  CHART_COLORS.success,
];

export default function FunnelChart({ data }: FunnelChartProps) {
  if (data.length === 0 || data.every(d => d.count === 0)) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No pipeline data yet
      </p>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    label: STAGE_LABELS[d.stage] ?? formatLabel(d.stage),
  }));

  const columns: ChartColumn<(typeof formatted)[number]>[] = [
    { header: 'Stage', render: row => row.label },
    { header: 'Jobs', render: row => row.count },
  ];

  return (
    <ChartFigure
      ariaLabel='Pipeline funnel: jobs by stage'
      rows={formatted}
      columns={columns}
      rowKey={row => row.stage}
    >
      <ResponsiveContainer width='100%' height={250}>
        <BarChart data={formatted} layout='vertical'>
          <CartesianGrid
            strokeDasharray='3 3'
            stroke={CHART_COLORS.grid}
            horizontal={false}
          />
          <XAxis type='number' allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type='category'
            dataKey='label'
            width={70}
            tick={{ fontSize: 12 }}
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey='count' name='Jobs' radius={[0, 4, 4, 0]}>
            {formatted.map((entry, i) => (
              <Cell
                key={entry.stage}
                fill={STAGE_COLORS[i % STAGE_COLORS.length]}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
