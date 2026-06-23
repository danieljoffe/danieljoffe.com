import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from './utils';

export interface PageLayoutProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

/**
 * Page shell: the `<main>` landmark and "Skip to main content" focus target.
 *
 * It is full-width, imposes no max-width, and adds no page padding — each
 * {@link Section} owns its own padding/margins (and constrains its own content
 * via Section's `contain` prop). The only thing the shell contributes is the
 * vertical rhythm *between* sections (`gap-y`); the leading whitespace belongs
 * to the first section, and the trailing whitespace to the page's footer.
 */
export function PageLayout({ children, className, ...rest }: PageLayoutProps) {
  return (
    <main
      id='main-content'
      // Without a tabindex the browser can't move focus here when the
      // "Skip to main content" link is activated.
      tabIndex={-1}
      // The App Router focuses this landmark after navigation; `.focus()`
      // scrolls it into view, which would otherwise scroll the (static) nav
      // off-screen. `scroll-mt` ≥ the nav height keeps the scroll at the top.
      className={cn(
        'flex w-full flex-col gap-y-16 scroll-mt-16 lg:gap-y-20',
        className
      )}
      {...rest}
    >
      {children}
    </main>
  );
}
