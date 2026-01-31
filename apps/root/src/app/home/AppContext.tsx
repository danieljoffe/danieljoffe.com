'use client';

import GlobalProvider from '@/state/Global/Provider';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { startTransition, Suspense, useRef } from 'react';

import ErrorBoundary from '@/components/ErrorBoundary';
import dynamic from 'next/dynamic';
import { WChildrenT } from '@/types/base';
import TransitionRouter from './TransitionRouter';

const Modal = dynamic(() => import('@/components/Modal'), { ssr: false });
const ScrollToElement = dynamic(() => import('./ScrollToElement'), {
  ssr: false,
});

export default function AppContext({ children }: WChildrenT) {
  const ref = useRef<HTMLDivElement>(null);

  const handleLeave = async (next: () => void) => {
    const main = ref.current;
    if (main) {
      requestAnimationFrame(() => {
        main.style.opacity = '0.9';
        startTransition(next);
      });
    } else {
      startTransition(next);
    }
    return () => undefined;
  };

  const handleEnter = async (next: () => void) => {
    const main = ref.current;
    if (main) {
      requestAnimationFrame(() => {
        main.style.transition = 'opacity 0.25s ease-out';
        main.style.opacity = '1';
        startTransition(next);
      });
    } else {
      startTransition(next);
    }

    return () => undefined;
  };

  return (
    <GlobalProvider>
      <TransitionRouter auto={true} leave={handleLeave} enter={handleEnter}>
        <Modal />
        <Nav />
        <div ref={ref} className='flex flex-col flex-1'>
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
        <Footer />
        <Suspense fallback={null}>
          <ScrollToElement />
        </Suspense>
      </TransitionRouter>
    </GlobalProvider>
  );
}
