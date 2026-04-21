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
      size={wide ? 'lg' : 'sm'}
      className={cn('py-16 lg:py-24 space-y-24', className)}
      {...rest}
    >
      {children}
    </PageContainer>
  );
}
