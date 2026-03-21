import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/errorTracking';
import { checkRateLimit, resetRateLimit } from '../rateLimit';

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    const { blocked, retryAfterSeconds } = checkRateLimit(ip);
    if (blocked) {
      return NextResponse.json(
        {
          error: 'Too many attempts. Try again later.',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds) },
        }
      );
    }

    const adminPassword = process.env['AUDIT_ADMIN_PASSWORD'];

    if (!adminPassword) {
      return NextResponse.json(
        { error: 'Admin not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password !== adminPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    resetRateLimit(ip);
    return NextResponse.json({ valid: true });
  } catch (error) {
    captureApiError(error, '/api/audit/admin/verify', 'POST', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
