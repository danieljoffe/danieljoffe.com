import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, sessionCookieOptions } from '@/lib/adminSession';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    ...sessionCookieOptions(0),
    value: '',
  });
  res.cookies.delete(ADMIN_SESSION_COOKIE);
  return res;
}
