import { NextRequest, NextResponse } from 'next/server';

/**
 * Verifies the admin password from the x-admin-password header.
 * Returns null if valid, or a NextResponse error if invalid.
 */
export function verifyAdminAuth(request: NextRequest): NextResponse | null {
  const adminPassword = process.env['AUDIT_ADMIN_PASSWORD'];

  if (!adminPassword) {
    return NextResponse.json(
      { error: 'Admin not configured' },
      { status: 503 }
    );
  }

  const provided = request.headers.get('x-admin-password');

  if (!provided || provided !== adminPassword) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
