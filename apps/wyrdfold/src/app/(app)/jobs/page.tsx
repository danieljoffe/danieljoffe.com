import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { fetchJsonFromWyrdfoldAPI } from '@/lib/api/proxy';
import type { UserTargetWithTarget } from '../targets/types';
import JobsList, { type TargetTab } from './JobsList';
import { JOB_STATUSES, type JobStatus } from './types';

export const metadata: Metadata = {
  title: 'Jobs',
};

const STATUS_SET = new Set<string>(JOB_STATUSES);

export default async function FittedJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const targetId =
    typeof params.target === 'string' ? params.target : undefined;
  const rawStatus = typeof params.status === 'string' ? params.status : '';
  const initialStatus: JobStatus | '' = STATUS_SET.has(rawStatus)
    ? (rawStatus as JobStatus)
    : '';
  const rawMinScore =
    typeof params.minScore === 'string' ? params.minScore : '';
  const parsedMinScore = Number.parseInt(rawMinScore, 10);
  const initialMinScore =
    Number.isFinite(parsedMinScore) &&
    parsedMinScore >= 0 &&
    parsedMinScore <= 100
      ? String(parsedMinScore)
      : '';

  const targetsRes = await fetchJsonFromWyrdfoldAPI<{
    targets: UserTargetWithTarget[];
  }>('/targets/mine');
  const initialTargets: TargetTab[] = (targetsRes?.targets ?? [])
    .filter(t => t.user_target.is_active)
    .map(t => ({ id: t.target.id, label: t.target.label }));

  // If the URL points to a target this user doesn't have active, drop the
  // filter rather than rendering an empty list. Server-side redirect avoids
  // a render → effect → client redirect waterfall.
  if (targetId && !initialTargets.some(t => t.id === targetId)) {
    redirect('/jobs');
  }

  return (
    <JobsList
      targetId={targetId}
      initialStatus={initialStatus}
      initialMinScore={initialMinScore}
      initialTargets={initialTargets}
    />
  );
}
