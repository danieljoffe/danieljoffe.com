import type { Metadata } from 'next';
import { fetchJsonFromWyrdfoldAPI } from '@/lib/api/proxy';
import DashboardPage, { type DashboardInitial } from '../DashboardPage';
import type { JobPosting } from '../jobs/types';
import type { UserTargetWithTarget } from '../targets/types';

export const metadata: Metadata = {
  title: 'Dashboard',
};

interface JobsListResponse {
  postings: JobPosting[];
  total: number;
  page: number;
  page_size: number;
}

const PIPELINE_STATUSES = ['new', 'saved', 'resume_draft', 'applied'] as const;

export default async function WyrdfoldDashboard() {
  // ``hasProfile`` checks whether the user has authored prose at all —
  // the underlying signal that "they've started onboarding." Earlier
  // versions used ``/experience/gap-health`` for this, but that route
  // returns a synthetic 200 body (``{gap_pct: 100, tier: 'red', gaps:
  // [...content.empty]}``) for users with no content, so the truthiness
  // check incorrectly flagged invited guests as already-onboarded and
  // sent them to the "no active targets" branch instead of the
  // onboarding CTA.
  const [topRes, proseRes, targetsRes, ...countResponses] = await Promise.all([
    fetchJsonFromWyrdfoldAPI<JobsListResponse>('/jobs', {
      searchParams: new URLSearchParams({
        status: 'new',
        sort: 'score',
        order: 'desc',
        page_size: '5',
      }),
    }),
    fetchJsonFromWyrdfoldAPI<{ prose: unknown }>('/experience/prose'),
    fetchJsonFromWyrdfoldAPI<{ targets: UserTargetWithTarget[] }>(
      '/targets/mine'
    ),
    ...PIPELINE_STATUSES.map(status =>
      fetchJsonFromWyrdfoldAPI<JobsListResponse>('/jobs', {
        searchParams: new URLSearchParams({ status, page_size: '1' }),
      })
    ),
  ]);

  const counts: Record<string, number> = {};
  countResponses.forEach((res, i) => {
    const status = PIPELINE_STATUSES[i];
    if (status) counts[status] = res?.total ?? 0;
  });

  const initial: DashboardInitial = {
    topMatches: topRes?.postings ?? [],
    counts,
    hasProfile: proseRes?.prose != null,
    hasActiveTargets:
      targetsRes?.targets?.some(t => t.user_target.is_active) ?? false,
  };

  return <DashboardPage initial={initial} />;
}
