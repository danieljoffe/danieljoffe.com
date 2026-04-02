'use client';

import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/cn';

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label='Scroll to top'
      className={cn(
        'fixed bottom-6 right-6 z-50 p-2.5 rounded-full',
        'bg-surface-elevated border border-brand-500/20 shadow-lg',
        'text-text-primary hover:border-brand-500/40 hover:bg-brand-500/5',
        'transition-all duration-200 cursor-pointer',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-2 pointer-events-none',
      )}
    >
      <ArrowUp className='h-4 w-4' />
    </button>
  );
}
