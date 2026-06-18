import { type ReactNode } from 'react';
import { PageContainer, type PageContainerProps } from './PageContainer';
import { cn } from './utils';

export interface PageLayoutProps extends Omit<
  PageContainerProps,
  'as' | 'size'
> {
  children: ReactNode;
  /** Use wider container (md) instead of default (sm) */
  wide?: boolean;
}

/**
 * Standard page layout with `<main>` landmark, skip-nav target,
 * and consistent vertical spacing. Wraps PageContainer with
 * app-level defaults.
 */
export function PageLayout({
  children,
  wide = false,
  className,
  ...rest
}: PageLayoutProps) {
  return (
    <PageContainer
      as='main'
      id='main-content'
      // Focus target for the "Skip to main content" link — without a tabindex
      // the browser can't move focus here when the skip link is activated.
      tabIndex={-1}
      size={wide ? 'lg' : 'sm'}
      className={cn('py-16 lg:py-24 space-y-24', className)}
      {...rest}
    >
      {children}
    </PageContainer>
  );
}
