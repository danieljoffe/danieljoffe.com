import { NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '@/app/api/jobs/proxy';

export async function POST() {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/experience/derive', { method: 'POST' });
}
