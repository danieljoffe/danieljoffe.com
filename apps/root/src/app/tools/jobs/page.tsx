import type { Metadata } from 'next';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import JobsDashboard from './JobsDashboard';

export const metadata: Metadata = {
  title: 'Job Search | Tools',
  robots: { index: false, follow: false },
};

export default function JobsPage() {
  return (
    <PageLayout>
      <JobsDashboard />
    </PageLayout>
  );
}
