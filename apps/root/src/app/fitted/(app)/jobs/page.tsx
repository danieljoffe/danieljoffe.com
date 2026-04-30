import type { Metadata } from 'next';
import JobsList from './JobsList';
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

  return (
    <JobsList
      targetId={targetId}
      initialStatus={initialStatus}
      initialMinScore={initialMinScore}
    />
  );
}
