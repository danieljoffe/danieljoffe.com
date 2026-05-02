import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import FittedSidebar from './FittedSidebar';

/**
 * Server-side auth backstop for /fitted/(app)/* routes. The proxy already
 * redirects unauthenticated requests, but Next.js Router Cache can replay
 * a previously-rendered RSC payload on client-side nav before the proxy
 * runs. Re-checking the session here means any cached payload still has
 * to pass an authenticated render — no auth, no shell.
 */
export default async function FittedAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/fitted/login');
  }

  return (
    <div className='flex min-h-screen'>
      <FittedSidebar />
      <main className='flex-1 overflow-x-hidden p-4 md:p-6'>
        {children}
        {/* Clearance for the mobile bottom nav (h-14) + iOS home indicator. */}
        <div
          aria-hidden='true'
          className='md:hidden'
          style={{
            height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)',
          }}
        />
      </main>
    </div>
  );
}
