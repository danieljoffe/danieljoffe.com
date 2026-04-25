import { NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../../jobs/proxy';

export async function GET() {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/targets/active');
}
