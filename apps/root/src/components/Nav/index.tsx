'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Spinner } from '@danieljoffe.com/shared-ui';
import { useModal } from '@/state/Modal/Provider';
import NavLinks from './Links';
import MobileNav from './MobileNav';

const TabletUpNav = dynamic(() => import('./TabletUpNav'), {
  loading: () => (
    <div className='hidden md:flex w-full justify-center items-center h-16 gap-4'>
      <Spinner size='md' aria-label='Loading navigation' />
    </div>
  ),
});

export default function Nav() {
  const pathname = usePathname();
  const { isModalOpen, setModalContent } = useModal();

  const handleMenuOpen = () => {
    setModalContent(
      <NavLinks pathname={pathname} handleClick={() => setModalContent(null)} />
    );
  };

  return (
    <section className='h-16 w-full sticky top-0 bg-background shadow-md z-30'>
      <nav className='w-full ' role='navigation' aria-label='Main navigation'>
        <TabletUpNav pathname={pathname} />
        <MobileNav menuOpen={isModalOpen} setMenuOpen={handleMenuOpen} />
      </nav>
    </section>
  );
}
