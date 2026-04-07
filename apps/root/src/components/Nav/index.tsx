'use client';

import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Skeleton } from '@danieljoffe.com/shared-ui/Skeleton';
import MobileNav from './MobileNav';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/** Returns false on the server, true on the client after hydration. */
function useHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function NavSkeleton() {
  return (
    <div className='hidden md:flex max-w-4xl mx-auto px-6 lg:px-0 h-14 items-center gap-1'>
      {/* Logo */}
      <Skeleton variant='rectangular' width={32} height={32} />

      {/* Primary links */}
      <div className='flex items-center gap-1 ml-6'>
        <Skeleton variant='rectangular' width={68} height={32} />
        <Skeleton variant='rectangular' width={68} height={32} />
        <Skeleton variant='rectangular' width={82} height={32} />
        <Skeleton variant='rectangular' width={60} height={32} />
      </div>

      {/* Right side: CTA, search, theme */}
      <div className='ml-auto flex items-center gap-1'>
        <Skeleton variant='rectangular' width={88} height={32} />
        <Skeleton variant='rectangular' width={56} height={32} />
        <Skeleton variant='rectangular' width={56} height={32} />
      </div>
    </div>
  );
}

const TabletUpNav = dynamic(() => import('./TabletUpNav'), {
  ssr: false,
  loading: () => <NavSkeleton />,
});

export default function Nav() {
  const pathname = usePathname();
  const hydrated = useHydrated();

  // Defer active-link state to after hydration so server and client agree
  const activePathname = hydrated ? pathname : '';

  return (
    <>
      <header className='hidden md:block sticky top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-border/60'>
        <nav role='navigation' aria-label='Main navigation'>
          <TabletUpNav pathname={activePathname} />
        </nav>
      </header>
      <MobileNav pathname={activePathname} />
    </>
  );
}
