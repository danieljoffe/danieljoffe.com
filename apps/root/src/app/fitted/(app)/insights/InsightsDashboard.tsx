'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { RefreshCw } from 'lucide-react';
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
const TopSkillGaps = dynamic(() => import('./charts/TopSkillGaps'), {
  ssr: false,
});
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

const PERIOD_FILTER_LABEL_ID = 'insights-period-label';

function PeriodFilter({
  value,
  onChange,
}: {
  value: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className='flex items-center gap-3'>
      <Text
        as='span'
        variant='caption'
        id={PERIOD_FILTER_LABEL_ID}
        className='text-text-secondary'
      >
        Period
      </Text>
      <div
        role='group'
        aria-labelledby={PERIOD_FILTER_LABEL_ID}
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
    </div>
  );
}

function ChartSkeleton() {
  return <Skeleton variant='rectangular' height={250} />;
}

function KpiSkeleton({ title }: { title: string }) {
  // Mirrors StatsCard's structure (p-6, caption, value text-2xl) so the
  // layout doesn't shift when real values land. See libs/shared/ui/src/lib/StatsCard.tsx.
  return (
    <div className='p-6 bg-surface-elevated border border-border rounded-xl shadow-xs'>
      <Text variant='caption'>{title}</Text>
      <Skeleton variant='text' size='lg' className='mt-1.5 w-24' />
    </div>
  );
}

function formatPct(value: number | null): string {
  if (value === null) return '--';
  return `${Math.round(value * 100)}%`;
}

function formatDays(value: number | null): string {
  if (value === null) return '--';
  return `${value.toFixed(1)}d`;
}

const RELATIVE_TIME = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function formatFreshness(fetchedAt: number | undefined): string | undefined {
  if (fetchedAt === undefined) return undefined;
  const diffMs = Date.now() - fetchedAt;
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 5) return 'Updated just now';
  if (diffSec < 60)
    return `Updated ${RELATIVE_TIME.format(-diffSec, 'second')}`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60)
    return `Updated ${RELATIVE_TIME.format(-diffMin, 'minute')}`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24)
    return `Updated ${RELATIVE_TIME.format(-diffHour, 'hour')}`;
  const diffDay = Math.round(diffHour / 24);
  return `Updated ${RELATIVE_TIME.format(-diffDay, 'day')}`;
}

function FreshnessBar({
  fetchedAt,
  loadingAny,
  onRefresh,
}: {
  fetchedAt: number | undefined;
  loadingAny: boolean;
  onRefresh: () => void;
}) {
  const label = formatFreshness(fetchedAt);
  return (
    <div className='flex items-center gap-3 text-text-secondary'>
      {label && (
        <Text as='span' variant='meta'>
          {label}
        </Text>
      )}
      <button
        type='button'
        onClick={onRefresh}
        disabled={loadingAny}
        aria-label='Refresh insights'
        className={[
          'inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm',
          'bg-surface text-text-primary hover:bg-surface-tertiary transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
        ].join(' ')}
      >
        <RefreshCw
          className={['h-4 w-4', loadingAny ? 'animate-spin' : ''].join(' ')}
          aria-hidden='true'
        />
        <span className='hidden sm:inline'>Refresh</span>
      </button>
    </div>
  );
}

export default function InsightsDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const { pipeline, targets, skillsCost, loading, error, fetchedAt, refresh } =
    useInsights(period);

  const showKpiSkeleton = loading.pipeline && !pipeline;
  const showVelocitySkeleton = loading.pipeline && !pipeline;
  const showFunnelSkeleton = loading.pipeline && !pipeline;
  const showScoreDistSkeleton = loading.targets && !targets;
  const showTargetCmpSkeleton = loading.targets && !targets;
  const showSkillFreqSkeleton = loading.skillsCost && !skillsCost;
  const showCostSkeleton = loading.skillsCost && !skillsCost;

  return (
    <div className='space-y-6'>
      {/* Toolbar: period filter + freshness/refresh */}
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <PeriodFilter value={period} onChange={setPeriod} />
        <FreshnessBar
          fetchedAt={fetchedAt}
          loadingAny={loading.any}
          onRefresh={refresh}
        />
      </div>

      {/* Error banner */}
      {error && (
        <div
          role='alert'
          className='rounded-md bg-error-light border border-error/30 p-3'
        >
          <Text variant='body' className='text-error'>
            {error}
          </Text>
        </div>
      )}

      {/* KPI cards */}
      <div
        className='grid gap-4 grid-cols-2 lg:grid-cols-4'
        role='status'
        aria-live='polite'
        aria-busy={showKpiSkeleton}
        aria-label='Pipeline summary'
      >
        {showKpiSkeleton ? (
          <>
            <KpiSkeleton title='Applications' />
            <KpiSkeleton title='Interviews' />
            <KpiSkeleton title='Response Rate' />
            <KpiSkeleton title='Avg Days to Response' />
          </>
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
      <Card aria-busy={showVelocitySkeleton}>
        <CardHeader>
          <CardTitle>Application Velocity</CardTitle>
        </CardHeader>
        <CardContent>
          {showVelocitySkeleton ? (
            <ChartSkeleton />
          ) : (
            <VelocityChart data={pipeline?.velocity ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Two-column row: Funnel + Score Distribution */}
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Card aria-busy={showFunnelSkeleton}>
          <CardHeader>
            <CardTitle>Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {showFunnelSkeleton ? (
              <ChartSkeleton />
            ) : (
              <FunnelChart data={pipeline?.funnel ?? []} />
            )}
          </CardContent>
        </Card>

        <Card aria-busy={showScoreDistSkeleton}>
          <CardHeader>
            <CardTitle>Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {showScoreDistSkeleton ? (
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
        <Card aria-busy={showTargetCmpSkeleton}>
          <CardHeader>
            <CardTitle>Target Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            {showTargetCmpSkeleton ? (
              <ChartSkeleton />
            ) : (
              <TargetComparisonChart data={targets?.targets ?? []} />
            )}
          </CardContent>
        </Card>

        <Card aria-busy={showSkillFreqSkeleton}>
          <CardHeader>
            <CardTitle>Skill Frequency</CardTitle>
          </CardHeader>
          <CardContent>
            {showSkillFreqSkeleton ? (
              <ChartSkeleton />
            ) : (
              <SkillFrequencyChart data={skillsCost?.top_skills ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Skill Gaps — ranked recommendations, full width */}
      <Card aria-busy={showSkillFreqSkeleton}>
        <CardHeader>
          <div className='flex items-baseline gap-4'>
            <CardTitle>Top Skill Gaps</CardTitle>
            <Text variant='meta'>
              Skills you&apos;re missing, ranked by impact on high-scoring jobs
            </Text>
          </div>
        </CardHeader>
        <CardContent>
          {showSkillFreqSkeleton ? (
            <Skeleton variant='rectangular' height={180} />
          ) : (
            <TopSkillGaps data={skillsCost?.top_missing ?? []} />
          )}
        </CardContent>
      </Card>

      {/* LLM Cost — full width */}
      <Card aria-busy={showCostSkeleton}>
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
          {showCostSkeleton ? (
            <ChartSkeleton />
          ) : (
            <CostChart data={skillsCost?.cost_over_time ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
