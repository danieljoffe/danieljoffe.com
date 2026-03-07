'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { WithChildren } from '@/types/base';
import ThemeProvider from '@/state/Theme/Provider';
import ModalProvider from '@/state/Modal/Provider';
import Nav from '@/components/Nav';
import ErrorBoundary from '@/components/ErrorBoundary';

const Modal = dynamic(() => import('@/components/Modal'), { ssr: false });
const ScrollToElement = dynamic(() => import('./ScrollToElement'), {
  ssr: false,
});

export default function AppContext({ children }: WithChildren) {
  return (
    <ThemeProvider>
      <ModalProvider>
        <Nav />
        <ErrorBoundary>{children}</ErrorBoundary>
        <Modal />
        <Suspense fallback={null}>
          <ScrollToElement />
        </Suspense>
      </ModalProvider>
    </ThemeProvider>
  );
}
