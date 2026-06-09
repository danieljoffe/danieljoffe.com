'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { Kbd } from '@danieljoffe/shared-ui/Kbd';
import { cn } from '@/lib/cn';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

const SCROLL_THRESHOLD = 300;

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useKeyboardShortcut('t', scrollToTop);

  return (
    <button
      onClick={scrollToTop}
      aria-label='Scroll to top (T)'
      className={cn(
        'fixed bottom-20 md:bottom-6 right-6 z-40 p-2.5 rounded-full',
        'bg-surface-elevated border border-brand-500/20 shadow-lg',
        'text-text-primary hover:border-brand-500/40 hover:bg-brand-500/5',
        'transition-all duration-200 cursor-pointer',
        'flex items-center gap-1.5',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none'
      )}
    >
      <ArrowUp className='h-4 w-4' />
      <Kbd>T</Kbd>
    </button>
  );
}
