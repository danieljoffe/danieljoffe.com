'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useGlobal } from '@/state/Global/Context';
import NavLinks from './Links';
import { Spinner } from '@danieljoffe.com/shared-ui';

const NavLoading = ({
  hasMobileClass: isMobile,
}: {
  hasMobileClass: boolean;
}) => (
  <div
    className={[
      'flex items-center justify-center',
      isMobile ? 'flex md:hidden' : 'hidden md:flex',
    ].join(' ')}
  >
    <div className='h-[4.5rem] flex items-center justify-center'>
      <Spinner size='sm' aria-label='Loading navigation' />
    </div>
  </div>
);

// Dynamically import MobileNav to avoid loading GSAP on desktop
const MobileNav = dynamic(() => import('./MobileNav'), {
  ssr: false,
  loading: () => <NavLoading hasMobileClass />,
});
const TabletUpNav = dynamic(() => import('./TabletUpNav'), {
  ssr: false,
  loading: () => <NavLoading hasMobileClass={false} />,
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
    <nav
      className='w-full fixed top-0 z-30 bg-background shadow-md'
      role='navigation'
      aria-label='Main navigation'
    >
      <TabletUpNav pathname={pathname} />
      <MobileNav menuOpen={isModalOpen} setMenuOpen={handleMenuOpen} />
    </nav>
  );
}
