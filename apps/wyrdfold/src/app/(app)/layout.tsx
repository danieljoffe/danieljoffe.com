import type { ReactNode } from 'react';
import WyrdfoldSidebar from './WyrdfoldSidebar';

// Auth gating for /(app)/* lives entirely in proxy.ts middleware, which runs
// on every matched request (including RSC navigations) and redirects to
// /login when there's no session. Re-doing supabase.auth.getUser() here would
// mean two network round-trips per page render, which serializes the shell
// behind a Supabase call that the middleware already made.

// Force dynamic rendering so the build never tries to prerender pages that
// depend on per-request cookies/Supabase auth. CI builds run without
// NEXT_PUBLIC_SUPABASE_URL set, so a static generation attempt would throw
// from createAuthServerClient before cookies() can mark the route dynamic.
export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen'>
      <WyrdfoldSidebar />
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
