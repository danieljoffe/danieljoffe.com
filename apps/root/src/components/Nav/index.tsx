'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Spinner } from '@danieljoffe.com/shared-ui/Spinner';
import MobileNav from './MobileNav';

const TabletUpNav = dynamic(() => import('./TabletUpNav'), {
  ssr: false,
  loading: () => (
    <div className='hidden md:flex w-full max-w-4xl mx-auto px-6 lg:px-0 h-14 items-center justify-center'>
      <Spinner size='sm' aria-label='Loading navigation' />
    </div>
  ),
});

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className='sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border/60'>
      <nav role='navigation' aria-label='Main navigation'>
        <TabletUpNav pathname={pathname} />
        <MobileNav pathname={pathname} />
      </nav>
    </header>
  );
}
