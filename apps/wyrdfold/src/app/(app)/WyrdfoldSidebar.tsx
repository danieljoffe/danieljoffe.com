'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Target,
  User,
  BarChart3,
  Settings,
  MoreHorizontal,
  LogOut,
  X,
} from 'lucide-react';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';
import DarkModeToggle from '@/components/Nav/DarkModeToggle';
import WyrdfoldLogo from '@/components/WyrdfoldLogo';

type Icon = typeof LayoutDashboard;
type NavItem = { id: string; label: string; href: string; lucide: Icon };

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    href: '/dashboard',
    lucide: LayoutDashboard,
  },
  { id: 'jobs', label: 'Jobs', href: '/jobs', lucide: Briefcase },
  { id: 'targets', label: 'Targets', href: '/targets', lucide: Target },
  { id: 'profile', label: 'Profile', href: '/profile', lucide: User },
  { id: 'insights', label: 'Insights', href: '/insights', lucide: BarChart3 },
  { id: 'settings', label: 'Settings', href: '/settings', lucide: Settings },
];

// Mobile shows the four daily-use tabs + More; the sheet picks up the rest.
const MOBILE_PRIMARY_IDS = ['dashboard', 'jobs', 'targets', 'profile'] as const;
const PRIMARY_ITEMS = MOBILE_PRIMARY_IDS.flatMap(id => {
  const item = NAV_ITEMS.find(n => n.id === id);
  return item ? [item] : [];
});
const MORE_ITEMS = NAV_ITEMS.filter(
  n => !MOBILE_PRIMARY_IDS.includes(n.id as (typeof MOBILE_PRIMARY_IDS)[number])
);

function activeIdFrom(pathname: string): string | undefined {
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  const match = NAV_ITEMS.find(
    item => item.id !== 'dashboard' && pathname.startsWith(item.href)
  );
  return match?.id;
}

export default function WyrdfoldSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = activeIdFrom(pathname ?? '') ?? '';
  const isMoreActive = MORE_ITEMS.some(item => item.id === activeId);

  const [sheetOpen, setSheetOpen] = useState(false);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useFocusTrap(sheetOpen) as React.RefObject<HTMLDivElement>;

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    moreButtonRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!sheetOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSheet();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sheetOpen, closeSheet]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sheetOpen]);

  async function handleSignOut() {
    setSheetOpen(false);
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.replace('/login');
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar — Link-based so Next can prefetch each route. */}
      <aside
        className='hidden md:flex flex-col h-screen sticky top-0 w-48 lg:w-60 bg-surface border-r border-border'
        aria-label='WyrdFold primary navigation'
      >
        <div className='p-4 border-b border-border shrink-0'>
          <Link
            href='/dashboard'
            aria-label='WyrdFold home'
            className='flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
          >
            <WyrdfoldLogo aria-label='WyrdFold' className='h-4 w-5' />
            <span className='text-sm font-semibold text-text-primary'>
              WyrdFold
            </span>
          </Link>
        </div>
        <nav className='flex-1 overflow-y-auto p-2 space-y-0.5'>
          {NAV_ITEMS.map(item => {
            const Icon = item.lucide;
            const active = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2 w-full justify-start rounded-md px-3 py-2 text-sm transition-colors motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                  active
                    ? 'bg-brand-50 text-brand-700 font-medium'
                    : 'text-text-secondary hover:bg-surface-tertiary hover:text-text-primary'
                )}
              >
                <Icon className='size-4 shrink-0' aria-hidden='true' />
                <span className='flex-1 text-left truncate'>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className='p-4 border-t border-border shrink-0'>
          <div className='flex flex-col gap-2'>
            <DarkModeToggle />
            <Button
              name='wyrdfold-sign-out'
              variant='outline'
              size='sm'
              onClick={handleSignOut}
              className='w-full justify-center'
            >
              <LogOut className='size-4' aria-hidden />
              <span>Sign out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile bottom bar */}
      <div
        className='md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border/60'
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <nav
          className='flex items-stretch justify-around h-14'
          aria-label='WyrdFold mobile navigation'
        >
          {PRIMARY_ITEMS.map(item => {
            const Icon = item.lucide;
            const active = activeId === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 gap-0.5 text-[10px] font-medium transition-colors',
                  active
                    ? 'text-brand-500'
                    : 'text-text-tertiary active:text-text-primary'
                )}
              >
                <Icon className='h-5 w-5' aria-hidden='true' />
                {item.label}
              </Link>
            );
          })}

          <Button
            name='wyrdfold-mobile-more'
            variant='bare'
            ref={moreButtonRef}
            onClick={sheetOpen ? closeSheet : () => setSheetOpen(true)}
            aria-expanded={sheetOpen}
            aria-label={sheetOpen ? 'Close more menu' : 'Open more menu'}
            className={cn(
              'flex flex-col items-center justify-center flex-1 gap-0.5 p-0 rounded-none hover:scale-100 text-[10px] font-medium transition-colors cursor-pointer',
              isMoreActive || sheetOpen
                ? 'text-brand-500'
                : 'text-text-tertiary active:text-text-primary'
            )}
          >
            <MoreHorizontal className='h-5 w-5' aria-hidden='true' />
            More
          </Button>
        </nav>
      </div>

      {/* Mobile backdrop */}
      {sheetOpen && (
        <div
          className='md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity'
          onClick={closeSheet}
          aria-hidden='true'
        />
      )}

      {/* Mobile bottom sheet — slides up from above the bar */}
      <div
        ref={sheetRef}
        role='dialog'
        aria-label='More navigation'
        aria-modal='true'
        aria-hidden={!sheetOpen}
        inert={!sheetOpen ? true : undefined}
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-border rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out max-h-[60vh] overflow-y-auto px-6 py-5',
          sheetOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        )}
        style={{
          paddingBottom: sheetOpen
            ? 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1.25rem)'
            : undefined,
        }}
      >
        <div className='flex items-center justify-between mb-3'>
          <span className='text-xs font-semibold text-text-tertiary uppercase tracking-wider'>
            More
          </span>
          <div className='flex items-center gap-1'>
            <DarkModeToggle />
            <Button
              name='wyrdfold-close-more'
              variant='bare'
              size='sm'
              iconOnly
              onClick={closeSheet}
              aria-label='Close more menu'
              className='rounded-lg text-text-tertiary hover:text-text-primary'
            >
              <X className='h-4 w-4' />
            </Button>
          </div>
        </div>
        <nav aria-label='More links'>
          <ul className='space-y-1'>
            {MORE_ITEMS.map(item => {
              const Icon = item.lucide;
              const active = activeId === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setSheetOpen(false)}
                    className={cn(
                      'w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
                      active
                        ? 'text-brand-500 bg-surface-tertiary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                    )}
                  >
                    <Icon className='h-4 w-4' aria-hidden='true' />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <Button
                name='wyrdfold-more-sign-out'
                variant='bare'
                onClick={handleSignOut}
                className='w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-lg hover:scale-100 text-sm font-medium transition-colors cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
              >
                <LogOut className='h-4 w-4' aria-hidden='true' />
                Sign out
              </Button>
            </li>
          </ul>
        </nav>
      </div>
    </>
  );
}
