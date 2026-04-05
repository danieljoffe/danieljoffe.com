import type { Metadata } from 'next';
import { PageContainer } from '@danieljoffe.com/shared-ui/PageContainer';
import AdminDashboard from './AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Audit Tool',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <PageContainer
      as='main'
      id='main-content'
      className='py-16 lg:py-24 space-y-24'
    >
      <AdminDashboard />
    </PageContainer>
  );
}
