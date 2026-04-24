import { NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../../proxy';

export async function POST(request: Request) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  return proxyToFastAPI('/tailor/batch', { method: 'POST', body });
}
