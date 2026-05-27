import type { Metadata } from 'next';
import { fetchJsonFromWyrdfoldAPI } from '@/lib/api/proxy';
import DashboardPage, { type DashboardInitial } from '../DashboardPage';
import type { JobPosting } from '../jobs/types';
import { hasProse, type ProseResponse } from '../profile/types';
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

// Mirrors ``PIPELINE_STATS`` in ``DashboardPage.tsx`` — keep in sync so
// every counter shown on the dashboard has a backing fetch here.
const PIPELINE_STATUSES = [
  'new',
  'saved',
  'resume_draft',
  'resume_ready',
  'applied',
  'interviewing',
  'offer',
] as const;

export default async function WyrdfoldDashboard() {
  // ``hasProfile`` checks whether the user has authored prose at all —
  // the underlying signal that "they've started onboarding." The
  // upstream ``/experience/prose`` endpoint returns ``{prose: null}``
  // when empty and the bare ``ProseDoc`` (``{id, content, ...}``) when
  // populated — two shapes for the same response. ``hasProse`` is the
  // type-guard from ``profile/types`` that handles both correctly.
  // A naive ``proseRes?.prose != null`` check matched only the empty
  // case and silently treated every populated response as ``no profile``,
  // sending users back to the onboarding CTA after they'd onboarded.
  const [topRes, proseRes, targetsRes, ...countResponses] = await Promise.all([
    fetchJsonFromWyrdfoldAPI<JobsListResponse>('/jobs', {
      searchParams: new URLSearchParams({
        status: 'new',
        sort: 'score',
        order: 'desc',
        page_size: '5',
      }),
    }),
    fetchJsonFromWyrdfoldAPI<ProseResponse>('/experience/prose'),
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
    hasProfile: proseRes != null && hasProse(proseRes),
    hasActiveTargets:
      targetsRes?.targets?.some(t => t.user_target.is_active) ?? false,
  };

  return <DashboardPage initial={initial} />;
}
