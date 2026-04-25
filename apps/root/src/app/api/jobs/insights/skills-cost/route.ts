import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../../proxy';

export async function GET(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/insights/skills-cost', {
    searchParams: request.nextUrl.searchParams,
  });
}
