'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { StatsCard } from '@danieljoffe.com/shared-ui/StatsCard';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { useInsights } from '@/hooks/useInsights';
import type { Period } from './types';

const CostChart = dynamic(() => import('./charts/CostChart'), { ssr: false });
const FunnelChart = dynamic(() => import('./charts/FunnelChart'), {
  ssr: false,
});
const ScoreDistributionChart = dynamic(
  () => import('./charts/ScoreDistributionChart'),
  { ssr: false }
);
const SkillFrequencyChart = dynamic(
  () => import('./charts/SkillFrequencyChart'),
  { ssr: false }
);
const TargetComparisonChart = dynamic(
  () => import('./charts/TargetComparisonChart'),
  { ssr: false }
);
const VelocityChart = dynamic(() => import('./charts/VelocityChart'), {
  ssr: false,
});

const PERIODS: { id: Period; label: string }[] = [
  { id: '7d', label: '7d' },
  { id: '30d', label: '30d' },
  { id: '90d', label: '90d' },
  { id: 'all', label: 'All' },
];

function PeriodFilter({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div
      role='group'
      aria-label='Time period'
      className='flex gap-1 p-1 bg-surface-tertiary rounded-lg'
    >
      {PERIODS.map(p => (
        <button
          key={p.id}
          type='button'
          onClick={() => onChange(p.id)}
          aria-pressed={value === p.id}
          className={[
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            value === p.id
              ? 'bg-surface text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
          ].join(' ')}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton variant='rectangular' height={250} />;
}

function formatPct(value: number | null): string {
  if (value === null) return '--';
  return `${Math.round(value * 100)}%`;
}

function formatDays(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}d`;
}

export default function InsightsDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const { pipeline, targets, skillsCost, loading, error } = useInsights(period);

  return (
    <div className='space-y-6'>
      {/* Period filter */}
      <PeriodFilter value={period} onChange={setPeriod} />

      {/* Error banner */}
      {error && (
        <div className='rounded-md bg-error-light border border-error/30 p-3'>
          <Text variant='body' className='text-error'>
            {error}
          </Text>
        </div>
      )}

      {/* KPI cards */}
      <div
        className='grid gap-4 grid-cols-2 lg:grid-cols-4'
        role='status'
        aria-label={loading && !pipeline ? 'Loading insights' : undefined}
      >
        {loading && !pipeline ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant='rectangular' height={100} />
          ))
        ) : (
          <>
            <StatsCard
              title='Applications'
              value={pipeline?.total_applications ?? 0}
            />
            <StatsCard
              title='Interviews'
              value={pipeline?.total_interviews ?? 0}
            />
            <StatsCard
              title='Response Rate'
              value={formatPct(pipeline?.response_rate ?? null)}
            />
            <StatsCard
              title='Avg Days to Response'
              value={formatDays(pipeline?.avg_days_to_response ?? null)}
            />
          </>
        )}
      </div>

      {/* Application velocity — full width */}
      <Card>
        <CardHeader>
          <CardTitle>Application Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !pipeline ? (
            <ChartSkeleton />
          ) : (
            <VelocityChart data={pipeline?.velocity ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Two-column row: Funnel + Score Distribution */}
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !pipeline ? (
              <ChartSkeleton />
            ) : (
              <FunnelChart data={pipeline?.funnel ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !targets ? (
              <ChartSkeleton />
            ) : (
              <ScoreDistributionChart
                data={targets?.score_distribution ?? []}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-column row: Target Comparison + Skill Frequency */}
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>Target Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !targets ? (
              <ChartSkeleton />
            ) : (
              <TargetComparisonChart data={targets?.targets ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Skill Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            {loading && !skillsCost ? (
              <ChartSkeleton />
            ) : (
              <SkillFrequencyChart data={skillsCost?.top_skills ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* LLM Cost — full width */}
      <Card>
        <CardHeader>
          <div className='flex items-baseline gap-4'>
            <CardTitle>LLM Cost</CardTitle>
            {skillsCost && (
              <Text variant='meta'>
                Total: ${skillsCost.total_cost.toFixed(2)}
                {skillsCost.avg_cost_per_resume !== null &&
                  ` | Avg/resume: $${skillsCost.avg_cost_per_resume.toFixed(3)}`}
              </Text>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && !skillsCost ? (
            <ChartSkeleton />
          ) : (
            <CostChart data={skillsCost?.cost_over_time ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
