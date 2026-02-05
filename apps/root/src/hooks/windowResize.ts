'use client';

import { useEffect, useState } from 'react';
import { useThrottle } from '@/hooks/useThrottle';

export interface WindowSizeInterface {
  windowWidth: number;
  windowHeight: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

export function useWindowResize() {
  const [size, setSize] = useState<WindowSizeInterface>({
    windowWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    windowHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
    isTablet:
      typeof window !== 'undefined'
        ? window.innerWidth >= 768 && window.innerWidth < 1024
        : false,
    isDesktop:
      typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
  });

  const updateSize = useThrottle(() => {
    if (typeof window === 'undefined') return;

    setSize({
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      isMobile: window.innerWidth < 768,
      isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
      isDesktop: window.innerWidth >= 1024,
    });
  }, 300);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
    };
  }, [updateSize]);

  return size;
}
