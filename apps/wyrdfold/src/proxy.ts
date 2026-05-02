import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { allowedOrigins, allowedImageOrigins } from '@/utils/constants';
import { isProduction } from '@/utils/helpers';

const HOME_DEFAULT = '/';

/**
 * Constrains `next` to a same-origin relative path. Anything else
 * (absolute URL, protocol-relative `//evil.com`, missing leading `/`)
 * falls back to / so the redirect can't be abused.
 */
function safeNext(value: string | null): string {
  if (!value) return HOME_DEFAULT;
  if (!value.startsWith('/') || value.startsWith('//')) return HOME_DEFAULT;
  return value;
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
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspValue = buildCspValue(request, nonce);

  if (!supabaseUrl || !anonKey) {
    return new NextResponse('Supabase configuration missing', { status: 401 });
  }

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

  if (pathname.startsWith('/login') || pathname.startsWith('/auth')) {
    if (user && pathname.startsWith('/login')) {
      const url = request.nextUrl.clone();
      url.pathname = safeNext(request.nextUrl.searchParams.get('next'));
      url.search = '';
      return NextResponse.redirect(url);
    }
    supabaseResponse.headers.set('Content-Security-Policy', cspValue);
    return supabaseResponse;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('next', pathname + search);
    return NextResponse.redirect(url);
  }

  supabaseResponse.headers.set('Content-Security-Policy', cspValue);
  return supabaseResponse;
}

export const config = {
  matcher: [
    {
      source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
    },
  ],
};
