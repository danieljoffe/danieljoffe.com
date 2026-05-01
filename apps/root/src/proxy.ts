import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createServerClient } from '@supabase/ssr';
import {
  allowedOrigins,
  allowedImageOrigins,
  HCAPTCHA_URL,
  HCAPTCHA_ASSETS_URL,
  STORYBOOK_URL,
  CALENDLY_EMBED_URL,
} from '@/utils/constants';
import { isProduction } from '@/utils/helpers';

const ADMIN_SESSION_COOKIE = 'admin_session';
const FITTED_DEFAULT = '/fitted';

/**
 * Constrains `next` to a same-origin relative path. Anything else
 * (absolute URL, protocol-relative `//evil.com`, missing leading `/`)
 * falls back to /fitted so the redirect can't be abused.
 */
function safeNext(value: string | null): string {
  if (!value) return FITTED_DEFAULT;
  if (!value.startsWith('/') || value.startsWith('//')) return FITTED_DEFAULT;
  return value;
}

function getAdminSecret(): Uint8Array | null {
  const secret = process.env['ADMIN_SESSION_SECRET'];
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

async function isValidAdminSession(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const secret = getAdminSecret();
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub === 'tools-admin';
  } catch {
    return false;
  }
}

function buildCspValue(request: NextRequest, nonce: string): string {
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: ${
      !isProduction() ? `'unsafe-eval'` : ''
    };
    style-src 'self' 'unsafe-inline';
    font-src 'self' https: data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-src ${HCAPTCHA_URL} ${HCAPTCHA_ASSETS_URL} ${STORYBOOK_URL} ${CALENDLY_EMBED_URL};
    frame-ancestors 'none';${
      request.nextUrl.protocol === 'https:'
        ? `\n    upgrade-insecure-requests;`
        : ''
    }
    connect-src 'self' ${allowedOrigins.join(' ')};
    img-src 'self' blob: data: ${allowedImageOrigins.join(' ')};
`;
  return cspHeader.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Handles Supabase Auth session refresh for /fitted/* routes.
 *
 * Refreshes the auth session on every request (keeps cookies in sync),
 * redirects unauthenticated users to /fitted/login, and applies CSP
 * headers to the response.
 */
async function handleFittedAuth(
  request: NextRequest,
  nonce: string,
  cspValue: string
): Promise<NextResponse> {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];

  if (!supabaseUrl || !anonKey) {
    return new NextResponse('Supabase configuration missing', { status: 401 });
  }

  // Set nonce on request headers so the app can read it via headers().
  // request.headers is mutable in Next.js proxy context — Supabase's
  // setAll uses request.cookies.set() which mutates headers the same way.
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', cspValue);

  let supabaseResponse = NextResponse.next({ request });

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

  const { pathname, search } = request.nextUrl;

  // Allow login and auth callback routes without authentication
  if (
    pathname.startsWith('/fitted/login') ||
    pathname.startsWith('/fitted/auth')
  ) {
    // If user is already logged in and visiting login, send them to the
    // requested destination (or /fitted as fallback). `safeNext` guards
    // against an attacker-controlled `next` becoming an open redirect.
    if (user && pathname.startsWith('/fitted/login')) {
      const url = request.nextUrl.clone();
      url.pathname = safeNext(request.nextUrl.searchParams.get('next'));
      url.search = '';
      return NextResponse.redirect(url);
    }
    supabaseResponse.headers.set('Content-Security-Policy', cspValue);
    return supabaseResponse;
  }

  // Redirect unauthenticated users to login, preserving the page they
  // tried to reach so the magic-link callback can return them there.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/fitted/login';
    url.search = '';
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  // IMPORTANT: Return the supabaseResponse object as-is (with CSP added)
  // to keep browser and server cookies in sync.
  supabaseResponse.headers.set('Content-Security-Policy', cspValue);
  return supabaseResponse;
}

export async function proxy(request: NextRequest) {
  // Admin JWT auth for /tools/admin
  if (request.nextUrl.pathname.startsWith('/tools/admin')) {
    const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!(await isValidAdminSession(token))) {
      const loginUrl = new URL('/tools/login', request.url);
      loginUrl.searchParams.set(
        'next',
        request.nextUrl.pathname + request.nextUrl.search
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspValue = buildCspValue(request, nonce);

  // Supabase Auth for /fitted/* routes
  if (request.nextUrl.pathname.startsWith('/fitted')) {
    return handleFittedAuth(request, nonce, cspValue);
  }

  // Default: apply CSP headers to all other routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set('Content-Security-Policy', cspValue);

  return response;
}

export const config = {
  matcher: [
    // /fitted/* runs on prefetches too, so prefetched RSC payloads for
    // protected routes get the redirect instead of caching the dashboard
    // shell client-side.
    { source: '/fitted/:path*' },
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|fitted).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
