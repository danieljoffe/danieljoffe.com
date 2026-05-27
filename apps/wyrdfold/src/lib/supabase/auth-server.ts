import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { connection } from 'next/server';

/**
 * Supabase client for server-side auth operations (Route Handlers,
 * Server Components, Server Actions). Uses the anon key + request
 * cookies, so RLS applies under the authenticated user's identity.
 *
 * `connection()` marks every caller as a dynamic-rendering boundary
 * before the env check fires — this lets layouts/pages drop
 * `export const dynamic = 'force-dynamic'`. Without it, the build
 * tries to prerender, hits the env throw, and bails with "prerender
 * error" in CI environments where NEXT_PUBLIC_SUPABASE_URL isn't set.
 */
export async function createAuthServerClient() {
  await connection();

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_ID environment variables'
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components can't mutate cookies — only Route Handlers,
        // Server Actions, and Middleware can. Supabase still tries to
        // write refreshed cookies whenever ``getSession()`` rotates the
        // token, and the throw used to escape into ``getAccessToken``'s
        // catch — collapsing the whole session to ``null`` and making
        // every SSR ``fetchJsonFromWyrdfoldAPI`` call return null. The
        // browser-side ``/api/*`` proxy routes were unaffected (Route
        // Handlers can write), which is why the Targets / Dashboard
        // pages rendered the zero-state while client fetches succeeded.
        // Suppress the write in the read-only context — middleware
        // handles the actual token refresh.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // no-op — see comment above
        }
      },
    },
  });
}
