import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from '../proxy';

export async function GET(request: NextRequest) {
  if (!verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return proxyToFastAPI('/sources');
}

export async function POST(request: NextRequest) {
  if (!verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  return proxyToFastAPI('/sources', { method: 'POST', body });
}
