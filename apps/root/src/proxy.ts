import { NextRequest, NextResponse } from 'next/server';
import {
  allowedOrigins,
  allowedImageOrigins,
  HCAPTCHA_URL,
  HCAPTCHA_ASSETS_URL,
  HCAPTCHA_WILDCARD_URL,
  STORYBOOK_URL,
  CALENDLY_EMBED_URL,
} from '@/utils/constants';
import { isProduction } from '@/utils/helpers';

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
    frame-src ${HCAPTCHA_URL} ${HCAPTCHA_ASSETS_URL} ${HCAPTCHA_WILDCARD_URL} ${STORYBOOK_URL} ${CALENDLY_EMBED_URL};
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
