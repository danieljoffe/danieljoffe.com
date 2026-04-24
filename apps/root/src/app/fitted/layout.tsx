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
 * Auth protection is handled by middleware.ts — unauthenticated
 * users are redirected to /fitted/login before reaching this layout.
 * The login page itself is outside the auth boundary.
 */
export default function FittedLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen flex-col'>
      <main className='flex-1'>{children}</main>
    </div>
  );
}
