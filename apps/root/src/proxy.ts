import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
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

  // Apply CSP headers to all routes
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
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
