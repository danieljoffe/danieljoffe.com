'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Section } from '@danieljoffe.com/shared-ui/Section';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import type { ScoresData } from './types';

interface ScoreDistributionProps {
  data: ScoresData;
}

const GRADE_COLORS: Record<string, string> = {
  A: '#63CAA5',
  B: '#8C8FFF',
  C: '#FFB46B',
  D: '#FF8CA0',
  F: '#FF6B6B',
};

export default function ScoreDistribution({ data }: ScoreDistributionProps) {
  const chartData = Object.entries(data.gradeDistribution).map(
    ([grade, count]) => ({
      grade,
      count,
    })
  );

  const hasData = data.total > 0;

  return (
    <Section aria-labelledby='scores-heading'>
      <Heading variant='section' as='h2' id='scores-heading'>
        Score Distribution
      </Heading>
      <Text variant='body' className='mt-2 mb-6'>
        {hasData
          ? `How ${data.total.toLocaleString()} audited sites grade overall.`
          : 'Score distribution will appear as more sites are audited.'}
      </Text>

      {hasData && (
        <>
          <div className='grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8'>
            {Object.entries(data.averages).map(([key, value]) => {
              if (key === 'overall') return null;
              const label =
                key === 'bestPractices'
                  ? 'Best Practices'
                  : key.charAt(0).toUpperCase() + key.slice(1);
              return (
                <div
                  key={key}
                  className='rounded-lg border border-border bg-surface-elevated p-3 text-center'
                >
                  <Text variant='detail' className='mb-1'>
                    Avg {label}
                  </Text>
                  <p className='text-xl font-bold text-foreground'>
                    {value !== null ? Math.round(value) : 'N/A'}
                  </p>
                </div>
              );
            })}
          </div>

          <div
            className='h-64 w-full'
            role='img'
            aria-label='Bar chart showing grade distribution across all audited sites'
          >
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={chartData}>
                <CartesianGrid
                  strokeDasharray='3 3'
                  className='stroke-border'
                />
                <XAxis dataKey='grade' className='fill-muted' />
                <YAxis className='fill-muted' />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    borderColor: 'var(--color-border)',
                    borderRadius: '0.5rem',
                  }}
                  labelStyle={{ color: 'var(--color-foreground)' }}
                />
                <Bar dataKey='count' radius={[4, 4, 0, 0]}>
                  {chartData.map(entry => (
                    <Cell key={entry.grade} fill={GRADE_COLORS[entry.grade]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Section>
  );
}
