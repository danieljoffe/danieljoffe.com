import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: {
    template: '%s | Fitted',
    default: 'Fitted',
  },
  robots: { index: false, follow: false },
};

/**
 * Root layout for the Fitted app.
 *
 * Auth protection is handled by proxy.ts — unauthenticated users
 * are redirected to /fitted/login before reaching any page.
 * The login page itself is outside the (app) route group.
 */
export default function FittedLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
