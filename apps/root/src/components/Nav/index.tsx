'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useModal } from '@/state/Modal/Provider';
import NavLinks from './Links';
import MobileNav from './MobileNav';

const TabletUpNav = dynamic(() => import('./TabletUpNav'), {
  loading: () => (
    <div className='hidden md:flex w-full max-w-3xl mx-auto px-6 lg:px-0 h-14 items-center justify-center'>
      <div className='h-4 w-4 animate-spin rounded-full border-2 border-border border-t-brand-500' />
    </div>
  ),
});

export default function Nav() {
  const pathname = usePathname();
  const { isModalOpen, setModalContent } = useModal();

  const handleMenuToggle = () => {
    if (isModalOpen) {
      setModalContent(null);
    } else {
      setModalContent(
        <NavLinks
          pathname={pathname}
          handleClick={() => setModalContent(null)}
        />
      );
    }
  };

  return (
    <header className='sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border/60'>
      <nav role='navigation' aria-label='Main navigation'>
        <TabletUpNav pathname={pathname} />
        <MobileNav menuOpen={isModalOpen} setMenuOpen={handleMenuToggle} />
      </nav>
    </header>
  );
}
