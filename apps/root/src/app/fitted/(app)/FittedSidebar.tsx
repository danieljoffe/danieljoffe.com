'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Target,
  User,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { Sidebar, type SidebarItem } from '@danieljoffe.com/shared-ui/Sidebar';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';
import DarkModeToggle from '@/components/Nav/DarkModeToggle';

const NAV_ITEMS: (SidebarItem & { href: string })[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/fitted',
    icon: <LayoutDashboard className='size-4' aria-hidden />,
  },
  {
    id: 'jobs',
    label: 'Jobs',
    href: '/fitted/jobs',
    icon: <Briefcase className='size-4' aria-hidden />,
  },
  {
    id: 'targets',
    label: 'Targets',
    href: '/fitted/targets',
    icon: <Target className='size-4' aria-hidden />,
  },
  {
    id: 'profile',
    label: 'Profile',
    href: '/fitted/profile',
    icon: <User className='size-4' aria-hidden />,
  },
  {
    id: 'insights',
    label: 'Insights',
    href: '/fitted/insights',
    icon: <BarChart3 className='size-4' aria-hidden />,
  },
  {
    id: 'settings',
    label: 'Settings',
    href: '/fitted/settings',
    icon: <Settings className='size-4' aria-hidden />,
  },
];

function activeIdFrom(pathname: string): string | undefined {
  // Exact match for dashboard, prefix match for others
  if (pathname === '/fitted' || pathname === '/fitted/') return 'dashboard';
  const match = NAV_ITEMS.find(
    item => item.id !== 'dashboard' && pathname.startsWith(item.href)
  );
  return match?.id;
}

export default function FittedSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useFocusTrap(mobileOpen) as React.RefObject<HTMLDivElement>;

  const activeId = activeIdFrom(pathname ?? '') ?? '';

  const handleSelect = useCallback(
    (id: string) => {
      const item = NAV_ITEMS.find(n => n.id === id);
      if (item) {
        setMobileOpen(false);
        router.push(item.href);
      }
    },
    [router]
  );

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [mobileOpen, closeMobile]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  async function handleSignOut() {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.replace('/fitted/login');
    router.refresh();
  }

  const sidebarHeader = (
    <span className='text-sm font-semibold text-text-primary'>Fitted</span>
  );

  const sidebarFooter = (
    <div className='flex flex-col gap-2'>
      <DarkModeToggle />
      <Button
        name='fitted-sign-out'
        variant='outline'
        size='sm'
        onClick={handleSignOut}
        className='w-full justify-center'
      >
        <LogOut className='size-4' aria-hidden />
        <span>Sign out</span>
      </Button>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className='md:hidden sticky top-0 z-30 flex items-center border-b border-border bg-surface/95 backdrop-blur-md px-4 h-14'>
        <button
          ref={hamburgerRef}
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-label='Open navigation'
          className='p-2 -ml-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors'
        >
          <Menu className='size-5' aria-hidden />
        </button>
        <span className='ml-3 text-sm font-semibold text-text-primary'>
          Fitted
        </span>
      </header>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className='md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity'
          onClick={closeMobile}
          aria-hidden='true'
        />
      )}

      {/* Mobile slide-in panel */}
      <div
        ref={panelRef}
        role='dialog'
        aria-label='Navigation'
        aria-modal='true'
        aria-hidden={!mobileOpen}
        inert={!mobileOpen ? true : undefined}
        className={cn(
          'md:hidden fixed inset-y-0 left-0 z-50 w-60 transform transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className='flex items-center justify-end p-2 absolute top-0 right-0 z-10'>
          <Button
            name='fitted-close-nav'
            variant='bare'
            size='sm'
            iconOnly
            onClick={closeMobile}
            aria-label='Close navigation'
            className='rounded-lg text-text-tertiary hover:text-text-primary'
          >
            <X className='size-4' />
          </Button>
        </div>
        <Sidebar
          items={NAV_ITEMS}
          activeId={activeId}
          onSelect={handleSelect}
          header={sidebarHeader}
          footer={sidebarFooter}
        />
      </div>

      {/* Desktop sidebar */}
      <div className='hidden md:block'>
        <Sidebar
          items={NAV_ITEMS}
          activeId={activeId}
          onSelect={handleSelect}
          header={sidebarHeader}
          footer={sidebarFooter}
        />
      </div>
    </>
  );
}
