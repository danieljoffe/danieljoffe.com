import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware that handles Supabase Auth session refresh for /fitted/* routes.
 *
 * - Refreshes the auth session on every request (keeps cookies in sync)
 * - Redirects unauthenticated users to /fitted/login
 * - Does NOT affect /tools/admin/* (uses its own JWT auth)
 * - Does NOT affect public routes (/, /blog, /about, etc.)
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];

  if (!supabaseUrl || !anonKey) {
    // If Supabase env vars are missing, let the request through
    // (will fail at the page level with a clearer error)
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANT: Do not add code between createServerClient and auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow login and auth callback routes without authentication
  if (
    pathname.startsWith('/fitted/login') ||
    pathname.startsWith('/fitted/auth')
  ) {
    // If user is already logged in and visiting login, redirect to /fitted
    if (user && pathname.startsWith('/fitted/login')) {
      const url = request.nextUrl.clone();
      url.pathname = '/fitted';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/fitted/login';
    return NextResponse.redirect(url);
  }

  // IMPORTANT: Return the supabaseResponse object as-is to keep
  // browser and server cookies in sync.
  return supabaseResponse;
}

export const config = {
  matcher: ['/fitted/:path*'],
};
