'use client';
import Logo from './Logo';
import DarkModeToggle from './DarkModeToggle';
import Button from '@/components/Button';
import { analytics } from '@/lib/analytics';
import dynamic from 'next/dynamic';

const MenuIcon = dynamic(() => import('./MenuIcon'), {
  ssr: false,
  loading: () => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
    >
      <path
        id='menuPath'
        d='M4 5H20M4 12H20M4 19H20'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  ),
});

export default function MobileNav({
  menuOpen,
  setMenuOpen,
}: {
  menuOpen: boolean;
  setMenuOpen: () => void;
}) {
  const handleToggle = () => {
    analytics.mobileMenuToggle(menuOpen ? 'close' : 'open');
    setMenuOpen();
  };

  return (
    <div className='md:hidden flex items-center justify-between w-full h-16 shadow'>
      <Logo />
      <div className='flex items-center gap-2'>
        <DarkModeToggle />
        <Button
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls='mobile-menu'
          onClick={handleToggle}
          variant='bare'
          name='toggle menu'
        >
          <MenuIcon isOpen={menuOpen} />
        </Button>
      </div>
    </div>
  );
}
