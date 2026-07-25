'use client';

import { ComponentType, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { WithChildren } from '@/types/base';
import { ThemeProvider } from '@/state/Theme/ThemeProvider';
import { ToastProvider } from '@/state/Toast/ToastProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
import { ScrollToTop } from '@/components/kit';
import KeyboardShortcuts from '@/components/KeyboardShortcuts';
import { RouteAnnouncer } from '@/components/RouteAnnouncer';
import { ViewTransitions } from '@/components/ViewTransitions';

const ScrollToElement = dynamic(() => import('./ScrollToElement'), {
  ssr: false,
});
const CommandPalette = dynamic(() => import('@/components/CommandPalette'), {
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
  ViewTransitions,
]);

export default function AppContext({ children }: WithChildren) {
  return (
    <Providers>
      <ErrorBoundary>{children}</ErrorBoundary>
      <ScrollToTop />
      <RouteAnnouncer />
      <KeyboardShortcuts />
      <CommandPalette />
      <Suspense fallback={null}>
        <ScrollToElement />
      </Suspense>
    </Providers>
  );
}
