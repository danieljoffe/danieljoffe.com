'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGlobal } from '@/state/Global/Context';
import NavLinks from './Links';
import { Spacer, Spinner } from '@danieljoffe.com/shared-ui';
import TabletUpNav from './TabletUpNav';

// Dynamically import MobileNav to avoid loading GSAP on desktop
const MobileNav = dynamic(() => import('./MobileNav'), {
  ssr: false,
  loading: () => (
    <div className='flex md:hidden items-center justify-center  py-2 px-2'>
      <div className='h-12 flex items-center justify-center'>
        <Spinner size='md' aria-label='Loading navigation' />
      </div>
    </div>
  ),
});

export default function Nav() {
  const pathname = usePathname();
  const { isModalOpen, setModalContent } = useGlobal();

  const handleMenuOpen = () => {
    setModalContent(
      <NavLinks pathname={pathname} handleClick={() => setModalContent(null)} />
    );
  };

  return (
    <section>
      <nav
        className='w-full fixed top-0 z-30 bg-background shadow-md'
        role='navigation'
        aria-label='Main navigation'
      >
        <TabletUpNav pathname={pathname} />
        <MobileNav menuOpen={isModalOpen} setMenuOpen={handleMenuOpen} />
      </nav>
      <Spacer size='xl' />
    </section>
  );
}
