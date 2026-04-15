import type { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';

export const dynamic = 'force-dynamic';

export default function ToolsAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className='flex min-h-[calc(100vh-4rem)]'>
      <AdminSidebar />
      <main className='flex-1 overflow-x-hidden p-6'>{children}</main>
    </div>
  );
}
