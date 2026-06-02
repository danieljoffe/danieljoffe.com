import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const DEFAULT_NEXT = '/dashboard';
const NEXT_COOKIE = 'wyrdfold_login_next';

// Email-OTP flows Supabase will deliver via `?token_hash=...&type=...` to
// this callback. These are inherently cross-browser (the user opens the
// email in whatever client they use), so they MUST NOT go through PKCE —
// the code_verifier cookie only exists in the browser that originated the
// sign-in. ``signup`` is included for future-proofing the same template;
// today the wyrdfold beta-invite path uses ``invite``.
const TOKEN_HASH_TYPES = new Set<EmailOtpType>([
  'invite',
  'recovery',
  'magiclink',
  'signup',
  'email',
  'email_change',
]);

function asOtpType(value: string | null): EmailOtpType | null {
  return value && (TOKEN_HASH_TYPES as Set<string>).has(value)
    ? (value as EmailOtpType)
    : null;
}

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
 * Handles the auth callback from Supabase. Two flows arrive here:
 *
 *  1. **Magic-link sign-in (PKCE)** — the user requested a link from
 *     /login in this browser, so a `code_verifier` cookie was set
 *     locally. Supabase redirects with `?code=...`; we call
 *     `exchangeCodeForSession`.
 *
 *  2. **Invite / recovery / email confirmation (token-hash, PKCE-free)**
 *     — the user clicked an emailed link, often in a different browser
 *     than where the invite originated. There is no code_verifier here,
 *     so PKCE cannot work. Supabase delivers these as
 *     `?token_hash=...&type=invite|recovery|magiclink|signup|email|email_change`
 *     and `verifyOtp` validates without a verifier.
 *
 * The destination is stashed in a short-lived cookie set by the login
 * form (a query-string `next` is also accepted as a fallback, but cookie
 * is preferred — Supabase strips query strings off the redirect URL when
 * it doesn't match the project's allowlist).
 *
 * Failures are surfaced to the user via `?auth_error=` on /login and
 * mirrored to Sentry. The default behavior (silent redirect to /login)
 * makes "magic link does nothing" impossible to debug from the outside.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin } = url;
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const otpType = asOtpType(searchParams.get('type'));
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const cookieStore = await cookies();
  const cookieNext = cookieStore.get(NEXT_COOKIE)?.value;
  const next = safeNext(
    cookieNext ? decodeURIComponent(cookieNext) : searchParams.get('next')
  );

  // Supabase forwards its own auth errors (e.g. expired link) by
  // redirecting back with `?error=...&error_description=...`. Surface
  // those before attempting any exchange.
  if (errorParam) {
    Sentry.captureMessage('auth/callback: supabase returned error', {
      level: 'warning',
      extra: { errorParam, errorDescription },
    });
    return bounceToLogin(origin, errorParam);
  }

  const supabase = await createAuthServerClient();

  // Token-hash flows (invite / recovery / etc) take precedence — they're
  // PKCE-free and cross-browser-safe, so they work even if a stale
  // verifier cookie is hanging around from a prior local sign-in attempt.
  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (error) {
      // Most common: link expired, already used, or the token-hash was
      // truncated by the mail client. Surface the GoTrue error code on
      // /login so the user knows to request a fresh link.
      Sentry.captureException(error, {
        tags: { route: 'auth/callback', flow: 'verify_otp', type: otpType },
      });
      return bounceToLogin(origin, error.code ?? 'verify_failed');
    }
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      // `exchangeCodeForSession` fails when the PKCE code_verifier
      // cookie is missing (e.g. the email was opened in a different
      // browser), the code expired, or it was already consumed. The
      // cross-browser case is now handled by the token-hash branch
      // above — if we land here it's same-browser breakage worth
      // surfacing.
      Sentry.captureException(error, {
        tags: { route: 'auth/callback', flow: 'pkce' },
        extra: { codeLength: code.length },
      });
      return bounceToLogin(origin, error.code ?? 'exchange_failed');
    }
  } else {
    // Neither flow's params present. Most common cause: Supabase
    // silently substituted site_url for an unallow-listed redirect, so
    // the link landed at /auth/callback (or wherever site_url points)
    // without the params Supabase would have appended.
    Sentry.captureMessage('auth/callback: no code or token_hash', {
      level: 'warning',
      extra: { search: url.search },
    });
    return bounceToLogin(origin, 'missing_code');
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  if (cookieNext) {
    response.cookies.delete(NEXT_COOKIE);
  }
  return response;
}
