import { NextResponse } from 'next/server';

const JOBS_ADMIN_PASSWORD = process.env['JOBS_ADMIN_PASSWORD'] ?? '';

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  if (!JOBS_ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: 'Jobs admin not configured' },
      { status: 503 }
    );
  }

  if (password === JOBS_ADMIN_PASSWORD) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
}
