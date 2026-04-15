import { NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/adminSession';

/**
 * Verifies the admin session cookie.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export async function verifyAdminAuth(): Promise<NextResponse | null> {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}
