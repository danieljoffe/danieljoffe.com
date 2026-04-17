import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from '../../proxy';

export async function GET(request: NextRequest) {
  if (!(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  return proxyToFastAPI('/sources/verify', { searchParams });
}
