import { type ReactNode } from 'react';
import { PageContainer, type PageContainerProps } from './PageContainer';

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
  ...rest
}: PageLayoutProps) {
  return (
    <PageContainer
      as='main'
      id='main-content'
      size={wide ? 'md' : 'sm'}
      {...rest}
    >
      {children}
    </PageContainer>
  );
}
