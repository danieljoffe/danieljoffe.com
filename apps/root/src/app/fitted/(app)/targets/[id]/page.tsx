import type { Metadata } from 'next';
import TargetDetail from './TargetDetail';

export const metadata: Metadata = {
  title: 'Target Detail',
};

export default async function FittedTargetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TargetDetail id={id} />;
}
