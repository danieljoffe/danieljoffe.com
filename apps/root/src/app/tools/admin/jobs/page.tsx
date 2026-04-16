import type { Metadata } from 'next';
import JobsDashboard from './JobsDashboard';

export const metadata: Metadata = {
  title: 'Jobs | Tools Admin',
  robots: { index: false, follow: false },
};

export default function JobsPage() {
  return <JobsDashboard />;
}
