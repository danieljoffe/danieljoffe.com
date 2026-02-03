'use client';
import Logo from './Logo';
import DarkModeToggle from './DarkModeToggle';
import Button from '@/components/Button';
import MorphSVGPlugin from 'gsap/MorphSVGPlugin';
import gsap from 'gsap';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import { analytics } from '@/lib/analytics';

gsap.registerPlugin(MorphSVGPlugin, useGSAP);

const MenuIcon = ({ isOpen }: { isOpen: boolean }) => {
  const ref = useRef(null);

  const tl = gsap.timeline({
    ease: 'expo',
  });

  useGSAP(() => {
    if (!ref.current) return;

    if (isOpen) {
      tl.to('#targetPath', {
        morphSVG: '#closePath',
        duration: 0.5,
        ease: 'power2.inOut',
      });
    } else {
      tl.to('#targetPath', {
        morphSVG: '#menuPath',
        duration: 0.5,
        ease: 'power2.inOut',
      });
    }
  }, [isOpen, ref]);

  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    >
      <g ref={ref}>
        <path
          id='targetPath'
          d='M4 5H20M4 12H20M4 19H20'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />

        <path
          id='menuPath'
          d='M4 5H20M4 12H20M4 19H20'
          stroke='transparent'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
        <path
          id='closePath'
          d='M18 6L6 18M6 6L18 18'
          stroke='transparent'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </g>
    </svg>
  );
};

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
    <div className='md:hidden flex items-center justify-between w-full py-4 px-4 shadow'>
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
