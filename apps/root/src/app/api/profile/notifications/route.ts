import { type NextRequest, NextResponse } from 'next/server';
import { proxyToFastAPI, verifyJobsAccess } from '@/app/api/jobs/proxy';

export async function GET() {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/profile/notifications');
}

export async function PATCH(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  return proxyToFastAPI('/profile/notifications', {
    method: 'PATCH',
    body,
  });
}
