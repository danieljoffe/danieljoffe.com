import type { Metadata } from 'next';
import DashboardPage from './DashboardPage';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function WyrdfoldDashboard() {
  return <DashboardPage />;
}
