import { NextResponse } from 'next/server';
import { proxyToFastAPI, verifyJobsAdmin } from '@/app/api/jobs/proxy';

export async function GET() {
  if (!(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/experience/optimized');
}
