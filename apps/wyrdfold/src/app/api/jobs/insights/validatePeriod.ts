import { NextResponse, type NextRequest } from 'next/server';

const VALID_PERIODS = new Set(['7d', '30d', '90d', 'all']);

/**
 * Reject malformed `?period=` values at the proxy layer with a typed error
 * payload (`code: 'invalid_period'`) so the UI can distinguish bad input
 * from a transient upstream failure. Returns null when the parameter is
 * absent or valid; the caller proceeds with the proxy call.
 */
export function validatePeriod(request: NextRequest): NextResponse | null {
  const period = request.nextUrl.searchParams.get('period');
  if (period === null) return null;
  if (!VALID_PERIODS.has(period)) {
    return NextResponse.json(
      {
        error: `Invalid period: '${period}'. Must be one of: 7d, 30d, 90d, all.`,
        code: 'invalid_period',
      },
      { status: 400 }
    );
  }
  return null;
}
