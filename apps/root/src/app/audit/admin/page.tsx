import type { Metadata } from 'next';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import AdminDashboard from './AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Audit Tool',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <PageLayout>
      <AdminDashboard />
    </PageLayout>
  );
}
