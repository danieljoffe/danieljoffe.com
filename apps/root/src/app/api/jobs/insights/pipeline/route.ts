import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '@/app/api/jobs/proxy';

export async function GET(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/insights/pipeline', {
    searchParams: request.nextUrl.searchParams,
  });
}
