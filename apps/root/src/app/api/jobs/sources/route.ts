import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI, IS_MOCK_MODE } from '../proxy';
import { MOCK_SOURCES } from '../mockData';

export async function GET(request: NextRequest) {
  if (!verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (IS_MOCK_MODE) {
    return NextResponse.json({ sources: MOCK_SOURCES });
  }

  return proxyToFastAPI('/sources');
}

export async function POST(request: NextRequest) {
  if (!verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (IS_MOCK_MODE) {
    return NextResponse.json({ success: true, mock: true });
  }

  const body = await request.json();
  return proxyToFastAPI('/sources', { method: 'POST', body });
}
