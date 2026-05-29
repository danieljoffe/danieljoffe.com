'use client';

import { useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
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
} from 'lucide-react';
import Button from '@/components/Button';
import { cn } from '@/lib/cn';
import DarkModeToggle from '@/components/Nav/DarkModeToggle';
import WyrdfoldLogo from '@/components/WyrdfoldLogo';

// Mobile sheet ships its own JSX, useFocusTrap, and the secondary nav.
// `dynamic({ ssr: false })` keeps it out of the eager bundle on every
// authed page — it loads only when the user taps "More". (Phase 5
// Perf P2 — sidebar weight cut.)
const MoreSheet = dynamic(() => import('./MoreSheet'), { ssr: false });

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
  // Stable id linking the "More" trigger to the MoreSheet dialog so
  // assistive tech can announce the relationship (aria-controls).
  // A static string instead of ``useId()`` because:
  //
  //   1. There's exactly one mobile sidebar per page, so id collisions
  //      aren't possible.
  //   2. ``useId()`` produced a SSR/CSR mismatch in Next 16 Turbopack
  //      dev — Server emitted ``aria-controls="_R_xxx_"`` on the
  //      button but the client hydration pass dropped it, triggering
  //      a React hydration error overlay. Static id avoids the issue
  //      entirely.
  const moreSheetId = 'wyrdfold-mobile-more-sheet';

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    moreButtonRef.current?.focus();
  }, []);

  // Lazy-import the Supabase browser client only when the user actually
  // signs out. Top-level import would pull @supabase/ssr into the eager
  // sidebar bundle on every authed page — significant for a flow used
  // once per session.
  async function handleSignOut() {
    const { createAuthBrowserClient } =
      await import('@/lib/supabase/auth-client');
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
            {/* Decorative — the visible "WyrdFold" text and the link's
                aria-label "WyrdFold home" already name this control.
                The SVG having its own aria-label produced "WyrdFold
                WyrdFold" in the accessible name, which Lighthouse's
                ``label-content-name-mismatch`` flagged against the
                outer "WyrdFold home" override. */}
            <WyrdfoldLogo aria-hidden className='h-4 w-5' />
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
            aria-controls={moreSheetId}
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

      {/* The sheet itself ships its own focus trap, dialog markup, and the
          secondary nav. dynamic-import keeps that out of every page until
          the user taps "More". */}
      {sheetOpen && (
        <MoreSheet
          id={moreSheetId}
          open={sheetOpen}
          onClose={closeSheet}
          items={MORE_ITEMS}
          activeId={activeId}
          onSignOut={handleSignOut}
        />
      )}
    </>
  );
}
