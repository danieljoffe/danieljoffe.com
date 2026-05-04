import type { Metadata } from 'next';
import { fetchJsonFromWyrdfoldAPI } from '@/lib/api/proxy';
import TargetsList from './TargetsList';
import type { UserTargetWithTarget } from './types';

export const metadata: Metadata = {
  title: 'Targets',
};

export default async function FittedTargetsPage() {
  const res = await fetchJsonFromWyrdfoldAPI<{
    targets: UserTargetWithTarget[];
  }>('/targets/mine');
  const initialTargets = res?.targets ?? [];

  return <TargetsList initialTargets={initialTargets} />;
}
