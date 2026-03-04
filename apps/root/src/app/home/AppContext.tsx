'use client';

import { TransitionRouter } from 'next-transition-router';
import { Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import { WithChildren } from '@/types/base';
import GlobalProvider from '@/state/Global/Provider';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';

const Modal = dynamic(() => import('@/components/Modal'), { ssr: false });
const ScrollToElement = dynamic(() => import('./ScrollToElement'), {
  ssr: false,
});

// GSAP is loaded dynamically to keep it off the critical rendering path.
// It's only needed for page transition animations, not on initial load.
let gsapModule: typeof import('gsap').default | null = null;

async function loadGsap() {
  if (!gsapModule) {
    gsapModule = (await import('gsap')).default;
  }
  return gsapModule;
}

export default function AppContext({ children }: WithChildren) {
  const transitionEffectRef = useRef<HTMLDivElement>(null);

  return (
    <GlobalProvider>
      <TransitionRouter
        auto={true}
        leave={async next => {
          const gsap = await loadGsap();
          gsap.fromTo(
            transitionEffectRef.current,
            { autoAlpha: 1, y: 0 },
            {
              autoAlpha: 0,
              y: -8,
              duration: 0.25,
              ease: 'power2.in',
              onComplete: next,
            }
          );
        }}
        enter={async next => {
          const gsap = await loadGsap();
          gsap.fromTo(
            transitionEffectRef.current,
            { autoAlpha: 0, y: -8 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              ease: 'power2.out',
              onComplete: next,
            }
          );
        }}
      >
        <Nav />
        <ErrorBoundary>
          <div ref={transitionEffectRef}>{children}</div>
        </ErrorBoundary>
        <Footer />
        <Modal />
        <Suspense fallback={null}>
          <ScrollToElement />
        </Suspense>
      </TransitionRouter>
    </GlobalProvider>
  );
}
