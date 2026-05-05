'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Gauge, LogOut } from 'lucide-react';
import { Sidebar, type SidebarItem } from '@danieljoffe.com/shared-ui/Sidebar';
import Button from '@/components/Button';

const NAV_ITEMS: (SidebarItem & { href: string })[] = [
  {
    id: 'audit',
    label: 'Site Audits',
    href: '/tools/admin/audit',
    icon: <Gauge className='size-4' aria-hidden />,
  },
];

function activeIdFrom(pathname: string): string | undefined {
  const match = NAV_ITEMS.find(item => pathname.startsWith(item.href));
  return match?.id;
}

export default function AdminSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = activeIdFrom(pathname ?? '') ?? '';

  async function handleLogout() {
    await fetch('/api/tools/logout', { method: 'POST' });
    router.replace('/tools/login');
    router.refresh();
  }

  return (
    <Sidebar
      items={NAV_ITEMS}
      activeId={activeId}
      onSelect={id => {
        const item = NAV_ITEMS.find(n => n.id === id);
        if (item) router.push(item.href);
      }}
      header={
        <div className='text-sm font-medium text-text-primary'>Tools Admin</div>
      }
      footer={
        <Button
          name='tools-sign-out'
          variant='outline'
          size='sm'
          onClick={handleLogout}
          className='w-full justify-center'
        >
          <LogOut className='size-4' aria-hidden />
          <span>Sign out</span>
        </Button>
      }
    />
  );
}
