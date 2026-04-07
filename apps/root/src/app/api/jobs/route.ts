import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI, IS_MOCK_MODE } from './proxy';
import { queryMockPostings } from './mockData';

export async function GET(request: NextRequest) {
  if (!verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (IS_MOCK_MODE) {
    return NextResponse.json(queryMockPostings(request.nextUrl.searchParams));
  }

  const searchParams = request.nextUrl.searchParams;
  return proxyToFastAPI('/jobs', { searchParams });
}
