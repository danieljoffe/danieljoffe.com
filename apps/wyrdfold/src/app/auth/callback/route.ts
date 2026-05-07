import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const DEFAULT_NEXT = '/dashboard';
const NEXT_COOKIE = 'wyrdfold_login_next';

/**
 * Constrains `next` to a same-origin relative path. Anything else
 * (absolute URL, protocol-relative `//evil.com`, missing leading `/`)
 * falls back to the default destination so the magic link can't be
 * abused as an open redirect.
 */
function safeNext(value: string | null | undefined): string {
  if (!value) return DEFAULT_NEXT;
  if (!value.startsWith('/') || value.startsWith('//')) return DEFAULT_NEXT;
  return value;
}

/**
 * Handles the magic link callback from Supabase Auth.
 *
 * When a user clicks the magic link in their email, Supabase redirects
 * to this route with a `code` query parameter. We exchange that code
 * for a session, then redirect to the page the user originally tried
 * to reach. The destination is stashed in a short-lived cookie set by
 * the login form (a query-string `next` is also accepted as a fallback,
 * but cookie is preferred — Supabase strips query strings off the
 * redirect URL when it doesn't match the project's allowlist).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  const cookieStore = await cookies();
  const cookieNext = cookieStore.get(NEXT_COOKIE)?.value;
  const next = safeNext(
    cookieNext ? decodeURIComponent(cookieNext) : searchParams.get('next')
  );

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      if (cookieNext) {
        response.cookies.delete(NEXT_COOKIE);
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
