import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

export interface PageLayoutProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/**
 * Page shell: the `<main>` landmark and "Skip to main content" focus target,
 * providing vertical rhythm between sections.
 *
 * It is full-width and imposes no max-width — each {@link Section} constrains
 * its own content (see Section's `contain` prop). This lets a section go
 * full-bleed (e.g. a hero with an edge-to-edge backdrop, or a full-width
 * background band) without having to break out of a shared container.
 */
export function PageLayout({ children, className, ...rest }: PageLayoutProps) {
  return (
    <main
      id='main-content'
      // Without a tabindex the browser can't move focus here when the
      // "Skip to main content" link is activated.
      tabIndex={-1}
      className={cn(
        'flex w-full flex-col gap-y-16 py-8 lg:gap-y-20 lg:py-12',
        className
      )}
      {...rest}
    >
      {children}
    </main>
  );
}
