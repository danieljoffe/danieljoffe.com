import type { Metadata } from 'next';
import CareerOverview from './CareerOverview';

export const metadata: Metadata = {
  title: 'Career | Tools Admin',
  robots: { index: false, follow: false },
};

export default function CareerAdminPage() {
  return <CareerOverview />;
}
