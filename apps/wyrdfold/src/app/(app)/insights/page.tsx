import type { Metadata } from 'next';

import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';

import { fetchJsonFromWyrdfoldAPI } from '@/lib/api/proxy';
import type { InsightsInitial } from '@/hooks/useInsights';

import InsightsDashboard from './InsightsDashboard';
import type {
  Period,
  PipelineInsights,
  SkillsCostInsights,
  TargetInsights,
} from './types';

export const metadata: Metadata = {
  title: 'Insights',
};

const DEFAULT_PERIOD: Period = '30d';

export default async function FittedInsights() {
  // Fetch the three insights datasets server-side in parallel so the
  // dashboard paints with data instead of three client→Next→API round-
  // trips after hydration (#851 P1). Each is null on failure so a
  // partial outage still renders the slices that did come back.
  const qs = new URLSearchParams({ period: DEFAULT_PERIOD });
  const [pipeline, targets, skillsCost] = await Promise.all([
    fetchJsonFromWyrdfoldAPI<PipelineInsights>('/jobs/insights/pipeline', {
      searchParams: qs,
    }),
    fetchJsonFromWyrdfoldAPI<TargetInsights>('/jobs/insights/targets', {
      searchParams: qs,
    }),
    fetchJsonFromWyrdfoldAPI<SkillsCostInsights>('/jobs/insights/skills-cost', {
      searchParams: qs,
    }),
  ]);

  const initial: InsightsInitial = {
    period: DEFAULT_PERIOD,
    pipeline: pipeline ?? undefined,
    targets: targets ?? undefined,
    skillsCost: skillsCost ?? undefined,
    fetchedAt: Date.now(),
  };

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='hero' as='h1'>
          Insights
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          Track your job search progress
        </Text>
      </div>
      <InsightsDashboard initial={initial} />
    </div>
  );
}
