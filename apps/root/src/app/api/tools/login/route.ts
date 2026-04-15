import { NextRequest, NextResponse } from 'next/server';
import { mintSessionToken, sessionCookieOptions } from '@/lib/adminSession';
import {
  checkRateLimit,
  resetRateLimit,
} from '@/app/api/audit/admin/rateLimit';

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const { blocked, retryAfterSeconds } = checkRateLimit(ip);
  if (blocked) {
    return NextResponse.json(
      { error: 'Too many attempts', retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  const expected = process.env['TOOLS_ADMIN_PASSWORD'];
  if (!expected) {
    return NextResponse.json(
      { error: 'Admin not configured' },
      { status: 503 }
    );
  }

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  resetRateLimit(ip);
  const token = await mintSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ ...sessionCookieOptions(), value: token });
  return res;
}
