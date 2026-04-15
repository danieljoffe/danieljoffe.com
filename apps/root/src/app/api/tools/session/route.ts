import { NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/adminSession';

export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true });
}
