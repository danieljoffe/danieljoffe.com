import type { ReactNode } from 'react';
import WyrdfoldSidebar from './WyrdfoldSidebar';

// Auth gating for /(app)/* lives entirely in proxy.ts middleware, which runs
// on every matched request (including RSC navigations) and redirects to
// /login when there's no session. Re-doing supabase.auth.getUser() here would
// mean two network round-trips per page render, which serializes the shell
// behind a Supabase call that the middleware already made.
//
// Dynamic-rendering is signalled at the leaf via `await connection()` inside
// `createAuthServerClient` (see lib/supabase/auth-server.ts). Pages calling
// auth opt-in there; the layout itself stays cacheable.

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen'>
      <WyrdfoldSidebar />
      {/*
        Mobile bottom-nav is `position: fixed` at viewport bottom (h-14 + iOS
        safe-area). The earlier "trailing clearance div" approach didn't bite
        for sticky / scroll-end content (pagination on /jobs sat under the
        nav; 4th target card on /targets was clipped). Layout-level padding
        on `<main>` is the defensive fix — anything sticky-bottom inside main
        will dock above the nav, and natural scroll bottoms get the same
        clearance for free.
      */}
      <main className='flex-1 overflow-x-hidden p-4 pb-[calc(theme(spacing.16)+env(safe-area-inset-bottom)+1rem)] md:p-6'>
        {children}
      </main>
    </div>
  );
}
