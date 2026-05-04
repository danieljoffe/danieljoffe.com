import type { Metadata } from 'next';
import TargetsList from './TargetsList';

export const metadata: Metadata = {
  title: 'Targets',
};

export default function FittedTargetsPage() {
  return <TargetsList />;
}
