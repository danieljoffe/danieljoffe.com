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
import type { SkillFrequency } from '../types';
import { ChartFigure, type ChartColumn } from './ChartFigure';
import { CHART_COLORS } from './colors';

interface SkillFrequencyChartProps {
  data: SkillFrequency[];
}

const COLUMNS: ChartColumn<SkillFrequency>[] = [
  { header: 'Skill', render: row => row.skill },
  { header: 'Matched', render: row => row.matched_count },
  { header: 'Missing', render: row => row.missing_count },
];

export default function SkillFrequencyChart({
  data,
}: SkillFrequencyChartProps) {
  if (data.length === 0) {
    return (
      <p className='text-sm text-text-secondary py-8 text-center'>
        No skill data yet
      </p>
    );
  }

  return (
    <ChartFigure
      ariaLabel='Skill frequency: matched versus missing skills across analyzed jobs'
      rows={data}
      columns={COLUMNS}
      rowKey={row => row.skill}
    >
      <ResponsiveContainer
        width='100%'
        height={Math.max(250, data.length * 30)}
      >
        <BarChart data={data} layout='vertical'>
          <CartesianGrid
            strokeDasharray='3 3'
            stroke={CHART_COLORS.grid}
            horizontal={false}
          />
          <XAxis type='number' allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type='category'
            dataKey='skill'
            width={120}
            tick={{ fontSize: 11 }}
          />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar
            dataKey='matched_count'
            name='Matched'
            stackId='a'
            fill={CHART_COLORS.success}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey='missing_count'
            name='Missing'
            stackId='a'
            fill={CHART_COLORS.error}
            fillOpacity={0.7}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFigure>
  );
}
