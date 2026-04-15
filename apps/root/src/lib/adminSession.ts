import { cookies } from 'next/headers';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const ADMIN_SESSION_COOKIE = 'admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

interface AdminPayload extends JWTPayload {
  sub: 'tools-admin';
}

function getSecret(): Uint8Array {
  const secret = process.env['ADMIN_SESSION_SECRET'];
  if (!secret || secret.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET env var must be set (>= 32 chars) to mint or verify admin sessions'
    );
  }
  return new TextEncoder().encode(secret);
}

export async function mintSessionToken(
  ttlSeconds = ADMIN_SESSION_TTL_SECONDS
): Promise<string> {
  return new SignJWT({ sub: 'tools-admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
    .sign(getSecret());
}

export async function verifySessionToken(
  token: string
): Promise<AdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.sub !== 'tools-admin') return null;
    return payload as AdminPayload;
  } catch {
    return null;
  }
}

export async function readAdminSession(): Promise<AdminPayload | null> {
  const jar = await cookies();
  const token = jar.get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function readAdminSessionToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ADMIN_SESSION_COOKIE)?.value ?? null;
}

export function sessionCookieOptions(
  maxAgeSeconds = ADMIN_SESSION_TTL_SECONDS
) {
  return {
    name: ADMIN_SESSION_COOKIE,
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
