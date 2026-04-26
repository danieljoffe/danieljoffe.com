import type { Metadata } from 'next';
import JobsList from './JobsList';

export const metadata: Metadata = {
  title: 'Jobs',
};

export default async function FittedJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const targetId =
    typeof params.target === 'string' ? params.target : undefined;

  return <JobsList targetId={targetId} />;
}
