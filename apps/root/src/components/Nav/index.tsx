'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import DarkModeToggle from './DarkModeToggle';
import { useGlobal } from '@/state/Global/Context';
import NavLinks from './Links';
import { Spinner } from '@danieljoffe.com/ui';

// Dynamically import MobileNav to avoid loading GSAP on desktop
const MobileNav = dynamic(() => import('./MobileNav'), {
  ssr: false,
  loading: () => (
    <div className='h-[4.5rem] flex items-center justify-center'>
      <Spinner size='sm' aria-label='Loading navigation' />,
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
    <nav
      className='w-full fixed top-0 z-30 bg-background shadow-md'
      role='navigation'
      aria-label='Main navigation'
    >
      <div className='hidden md:flex w-full justify-center items-center py-4 px-8 gap-4'>
        <NavLinks pathname={pathname} />
        <DarkModeToggle />
      </div>

      <MobileNav menuOpen={isModalOpen} setMenuOpen={handleMenuOpen} />
    </nav>
  );
}
