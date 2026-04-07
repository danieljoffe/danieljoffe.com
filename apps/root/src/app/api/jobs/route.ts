import { type NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from './proxy';

export async function GET(request: NextRequest) {
  if (!verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  return proxyToFastAPI('/jobs', { searchParams });
}
