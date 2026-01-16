'use client';

import GlobalProvider from '@/state/Global/Provider';
import Nav from '@/components/Nav';
import { TransitionRouter } from 'next-transition-router';
import { startTransition, Suspense, useRef } from 'react';

import ErrorBoundary from '@/components/ErrorBoundary';
import dynamic from 'next/dynamic';
import { WChildrenT } from '@/types/base';

const Modal = dynamic(() => import('@/components/Modal'));
const ScrollToElement = dynamic(() => import('./ScrollToElement'));

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
        <main
          ref={ref}
          id='main-content'
          role='main'
          className='flex flex-col flex-1'
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
        <Suspense fallback={null}>
          <ScrollToElement />
        </Suspense>
      </TransitionRouter>
    </GlobalProvider>
  );
}
