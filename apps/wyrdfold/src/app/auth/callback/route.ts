import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
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
 * Bounce back to /login with a short, user-readable reason in the
 * query string. The login page reads `?auth_error=...` and surfaces
 * it inline, so silent failures stop being silent.
 */
function bounceToLogin(origin: string, reason: string): NextResponse {
  const url = new URL('/login', origin);
  url.searchParams.set('auth_error', reason);
  return NextResponse.redirect(url);
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
 *
 * Failures are surfaced to the user via `?auth_error=` on /login and
 * mirrored to Sentry. The default behavior (silent redirect to /login)
 * makes "magic link does nothing" impossible to debug from the outside.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const cookieStore = await cookies();
  const cookieNext = cookieStore.get(NEXT_COOKIE)?.value;
  const next = safeNext(
    cookieNext ? decodeURIComponent(cookieNext) : searchParams.get('next')
  );

  // Supabase forwards its own auth errors (e.g. expired link) by
  // redirecting back with `?error=...&error_description=...`. Surface
  // those before attempting to exchange a code.
  if (errorParam) {
    Sentry.captureMessage('auth/callback: supabase returned error', {
      level: 'warning',
      extra: { errorParam, errorDescription },
    });
    return bounceToLogin(origin, errorParam);
  }

  if (!code) {
    // Most common cause: Supabase silently substituted site_url for
    // an unallow-listed redirect. The email link landed at /auth/callback
    // (or wherever site_url points) without the `?code=` Supabase
    // would have appended, so there's nothing to exchange.
    Sentry.captureMessage('auth/callback: missing code', {
      level: 'warning',
      extra: { search: url.search },
    });
    return bounceToLogin(origin, 'missing_code');
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // ``exchangeCodeForSession`` fails when the PKCE code_verifier
    // cookie is missing (e.g. the email was opened in a different
    // browser), the code expired, or it was already consumed.
    Sentry.captureException(error, {
      tags: { route: 'auth/callback' },
      extra: { codeLength: code.length },
    });
    return bounceToLogin(origin, error.code ?? 'exchange_failed');
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  if (cookieNext) {
    response.cookies.delete(NEXT_COOKIE);
  }
  return response;
}
