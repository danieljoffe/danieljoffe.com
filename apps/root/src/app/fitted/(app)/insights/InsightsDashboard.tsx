'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@danieljoffe.com/shared-ui/Card';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import { StatsCard } from '@danieljoffe.com/shared-ui/StatsCard';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import Button from '@/components/Button';
import { useInsights } from '@/hooks/useInsights';
import { cn } from '@/lib/cn';
import { downloadInsightsCsv } from './exportCsv';
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
      aria-label='Period'
      className='flex w-full gap-1 p-1 bg-surface-tertiary rounded-lg'
    >
      {PERIODS.map(p => (
        <button
          key={p.id}
          type='button'
          onClick={() => onChange(p.id)}
          aria-pressed={value === p.id}
          className={cn(
            'flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
            value === p.id
              ? 'bg-surface text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
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

function KpiSkeleton({ title }: { title: string }) {
  // Mirrors StatsCard's responsive structure so the layout doesn't shift when
  // real values land. See libs/shared/ui/src/lib/StatsCard.tsx.
  return (
    <div className='p-3 sm:p-6 bg-surface-elevated border border-border rounded-xl shadow-xs'>
      <Text variant='caption'>{title}</Text>
      <Skeleton variant='text' size='lg' className='mt-1 sm:mt-1.5 w-24' />
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

/** Percentage change between two integer counts. Returns undefined when the
 * prior value is missing or zero (any pct change is undefined). */
function pctChange(
  curr: number,
  prev: number | null | undefined
): number | undefined {
  if (prev === null || prev === undefined || prev === 0) return undefined;
  return Math.round(((curr - prev) / prev) * 100);
}

/** Absolute delta between two numeric KPIs, rounded to *digits* decimals.
 * Returns undefined if either side is missing. */
function absDelta(
  curr: number | null,
  prev: number | null | undefined,
  digits: number
): number | undefined {
  if (curr === null || prev === null || prev === undefined) return undefined;
  const factor = 10 ** digits;
  return Math.round((curr - prev) * factor) / factor;
}

const PRIOR_LABEL = 'vs prior period';

export default function InsightsDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const { pipeline, targets, skillsCost, loading, error } = useInsights(period);

  const showKpiSkeleton = loading.pipeline && !pipeline;
  const showVelocitySkeleton = loading.pipeline && !pipeline;
  const showFunnelSkeleton = loading.pipeline && !pipeline;
  const showScoreDistSkeleton = loading.targets && !targets;
  const showTargetCmpSkeleton = loading.targets && !targets;
  const showSkillFreqSkeleton = loading.skillsCost && !skillsCost;
  const showCostSkeleton = loading.skillsCost && !skillsCost;

  const handleDownload = useCallback(() => {
    downloadInsightsCsv({ period, pipeline, targets, skillsCost });
  }, [period, pipeline, targets, skillsCost]);

  const hasAnyData = Boolean(pipeline ?? targets ?? skillsCost);

  return (
    <div className='space-y-6'>
      {/* Period filter — full-width */}
      <PeriodFilter value={period} onChange={setPeriod} />

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
          (() => {
            const prev = pipeline?.previous ?? null;
            const applicationsChange = prev
              ? pctChange(
                  pipeline?.total_applications ?? 0,
                  prev.total_applications
                )
              : undefined;
            const interviewsChange = prev
              ? pctChange(
                  pipeline?.total_interviews ?? 0,
                  prev.total_interviews
                )
              : undefined;
            // Response rate compared in percentage points (curr - prev) * 100.
            const responseRatePp =
              prev && pipeline?.response_rate !== null
                ? absDelta(
                    (pipeline?.response_rate ?? 0) * 100,
                    prev.response_rate !== null
                      ? prev.response_rate * 100
                      : null,
                    1
                  )
                : undefined;
            // Avg days delta is absolute days, lower is better.
            const avgDaysDelta = prev
              ? absDelta(
                  pipeline?.avg_days_to_response ?? null,
                  prev.avg_days_to_response,
                  1
                )
              : undefined;
            return (
              <>
                <StatsCard
                  title='Applications'
                  value={pipeline?.total_applications ?? 0}
                  {...(applicationsChange !== undefined
                    ? { change: applicationsChange, changeLabel: PRIOR_LABEL }
                    : {})}
                />
                <StatsCard
                  title='Interviews'
                  value={pipeline?.total_interviews ?? 0}
                  {...(interviewsChange !== undefined
                    ? { change: interviewsChange, changeLabel: PRIOR_LABEL }
                    : {})}
                />
                <StatsCard
                  title='Response Rate'
                  value={formatPct(pipeline?.response_rate ?? null)}
                  {...(responseRatePp !== undefined
                    ? {
                        change: responseRatePp,
                        changeUnit: 'pp',
                        changeLabel: PRIOR_LABEL,
                      }
                    : {})}
                />
                <StatsCard
                  title='Avg Days to Response'
                  value={formatDays(pipeline?.avg_days_to_response ?? null)}
                  {...(avgDaysDelta !== undefined
                    ? {
                        change: avgDaysDelta,
                        changeUnit: 'd',
                        invertChange: true,
                        changeLabel: PRIOR_LABEL,
                      }
                    : {})}
                />
              </>
            );
          })()
        )}
      </div>

      {/* Weekly activity — full width */}
      <Card aria-busy={showVelocitySkeleton}>
        <CardHeader>
          <div className='flex items-baseline gap-x-4 gap-y-1 flex-wrap'>
            <CardTitle>Weekly Activity</CardTitle>
            <Text variant='meta'>
              Resumes drafted vs applications submitted, per week
            </Text>
          </div>
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
                unscoredCount={targets?.unscored_count ?? 0}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Two-column row: Target Comparison + Skill Frequency */}
      <div className='grid gap-6 grid-cols-1 lg:grid-cols-2'>
        <Card aria-busy={showTargetCmpSkeleton}>
          <CardHeader>
            <div className='flex items-baseline gap-x-4 gap-y-1 flex-wrap'>
              <CardTitle>Target Comparison</CardTitle>
              <Text variant='meta'>
                Avg score and interview conversion across your saved targets
              </Text>
            </div>
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
            <div className='flex items-baseline gap-x-4 gap-y-1 flex-wrap'>
              <CardTitle>Skill Mentions</CardTitle>
              <Text variant='meta'>
                How often each skill appears across your analyzed jobs
              </Text>
            </div>
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

      {/* What to Learn Next — ranked recommendations, full width */}
      <Card aria-busy={showSkillFreqSkeleton}>
        <CardHeader>
          <div className='flex items-baseline gap-x-4 gap-y-1 flex-wrap'>
            <CardTitle>What to Learn Next</CardTitle>
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

      {/* Download — bottom of page */}
      <div className='flex justify-center pt-2'>
        <Button
          name='insights-download'
          variant='outline'
          size='sm'
          onClick={handleDownload}
          disabled={loading.any || !hasAnyData}
        >
          <Download className='size-4' aria-hidden />
          <span>Download insights</span>
        </Button>
      </div>
    </div>
  );
}
