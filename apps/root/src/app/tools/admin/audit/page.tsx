import type { Metadata } from 'next';
import AdminDashboard from './AdminDashboard';

export const metadata: Metadata = {
  title: 'Site Audits | Tools Admin',
  robots: { index: false, follow: false },
};

export default function AuditAdminPage() {
  return <AdminDashboard />;
}
