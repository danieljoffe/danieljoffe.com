import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '@/app/api/jobs/proxy';

export async function POST(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  return proxyToFastAPI('/experience/conversation/turn', {
    method: 'POST',
    body,
  });
}
