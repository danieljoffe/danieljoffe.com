'use client';

import { Suspense } from 'react';
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

export default function AppContext({ children }: WithChildren) {
  return (
    <GlobalProvider>
      <Nav />
      <ErrorBoundary>{children}</ErrorBoundary>
      <Footer />
      <Modal />
      <Suspense fallback={null}>
        <ScrollToElement />
      </Suspense>
    </GlobalProvider>
  );
}
