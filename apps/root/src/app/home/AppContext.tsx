'use client';

import gsap from 'gsap';
import { TransitionRouter } from 'next-transition-router';
import { startTransition, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { WChildrenT } from '@/types/base';
import GlobalProvider from '@/state/Global/Provider';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';

const Modal = dynamic(() => import('@/components/Modal'), { ssr: false });
const ScrollToElement = dynamic(() => import('./ScrollToElement'), {
  ssr: false,
});

export default function AppContext({ children }: WChildrenT) {
  const slidingPane = useRef<HTMLDivElement | null>(null);

  return (
    <GlobalProvider>
      <TransitionRouter
        auto={true}
        leave={next => {
          const tl = gsap
            .timeline({
              onComplete: next,
            })
            .fromTo(
              slidingPane.current,
              {
                x: '100%',
                y: 0,
              },
              {
                x: 0,
                duration: 0.65,
                ease: 'power4.inOut',
              }
            );
          return () => {
            tl.kill();
          };
        }}
        enter={next => {
          const tl = gsap
            .timeline()
            .fromTo(
              slidingPane.current,
              {
                x: 0,
                y: 0,
              },
              {
                x: '-100%',
                duration: 0.65,
                ease: 'power4.out',
              },
              '<50%'
            )
            .call(
              () => {
                requestAnimationFrame(() => {
                  startTransition(next);
                });
              },
              undefined,
              '<50%'
            );

          return () => {
            tl.kill();
          };
        }}
      >
        <Modal />
        <Nav />
        <ErrorBoundary>
          {children}
          <div
            ref={slidingPane}
            className='fixed inset-0 z-50 translate-x-full bg-background'
          />
        </ErrorBoundary>
        <Footer />
        <Suspense fallback={null}>
          <ScrollToElement />
        </Suspense>
      </TransitionRouter>
    </GlobalProvider>
  );
}
