import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const ADMIN_SESSION_COOKIE = 'admin_session';

function getSecret(): Uint8Array | null {
  const secret = process.env['ADMIN_SESSION_SECRET'];
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

async function isValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub === 'tools-admin';
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await isValidSession(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/tools/login', req.url);
  const next = req.nextUrl.pathname + req.nextUrl.search;
  loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/tools/admin/:path*'],
};
