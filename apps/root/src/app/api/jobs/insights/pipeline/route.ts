import { type NextRequest, NextResponse } from 'next/server';
import { proxyToFastAPI, verifyJobsAccess } from '@/app/api/jobs/proxy';
import { validatePeriod } from '@/app/api/jobs/insights/validatePeriod';

export async function GET(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const invalid = validatePeriod(request);
  if (invalid) return invalid;
  return proxyToFastAPI('/insights/pipeline', {
    searchParams: request.nextUrl.searchParams,
  });
}
