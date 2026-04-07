import { NextResponse } from 'next/server';
import { IS_MOCK_MODE } from '../proxy';

const JOBS_ADMIN_PASSWORD = process.env['JOBS_ADMIN_PASSWORD'] ?? '';

export async function POST(request: Request) {
  const body = await request.json();
  const { password } = body;

  // In mock mode accept any non-empty password
  if (IS_MOCK_MODE) {
    if (password) return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'Enter any password' }, { status: 401 });
  }

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
