import type { Metadata } from 'next';
import JobDetailPage from './JobDetailPage';

export const metadata: Metadata = {
  title: 'Job Detail',
};

export default async function FittedJobDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const search = await searchParams;
  const targetId =
    typeof search.target === 'string' ? search.target : undefined;

  return <JobDetailPage id={id} targetId={targetId} />;
}
