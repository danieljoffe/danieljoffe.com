'use client';

import { ComponentType, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { WithChildren } from '@/types/base';
import { ThemeProvider } from '@/state/Theme/ThemeProvider';
import { ToastProvider } from '@/state/Toast/ToastProvider';
import ModalProvider from '@/state/Modal/ModalProvider';
import Nav from '@/components/Nav';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ScrollToTop } from '@/components/kit';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';

const Modal = dynamic(() => import('@/components/Modal'), { ssr: false });
const ScrollToElement = dynamic(() => import('./ScrollToElement'), {
  ssr: false,
});

const composeProviders = (providers: ComponentType<WithChildren>[]) =>
  providers.reduce((Acc, Curr) => {
    const Composed = ({ children }: WithChildren) => (
      <Acc>
        <Curr>{children}</Curr>
      </Acc>
    );
    Composed.displayName = `${Acc.displayName ?? Acc.name}(${Curr.displayName ?? Curr.name})`;
    return Composed;
  });

const Providers = composeProviders([
  ThemeProvider,
  ToastProvider,
  ModalProvider,
]);

export default function AppContext({ children }: WithChildren) {
  return (
    <Providers>
      <Nav />
      <ErrorBoundary>{children}</ErrorBoundary>
      <Modal />
      <ScrollToTop />
      <KeyboardShortcuts />
      <Suspense fallback={null}>
        <ScrollToElement />
      </Suspense>
    </Providers>
  );
}
