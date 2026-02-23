import type { Metadata } from 'next';
import MainContent from '@/components/MainContent';
import AdminDashboard from './AdminDashboard';

export const metadata: Metadata = {
  title: 'Admin Dashboard | Audit Tool',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <MainContent>
      <AdminDashboard />
    </MainContent>
  );
}
