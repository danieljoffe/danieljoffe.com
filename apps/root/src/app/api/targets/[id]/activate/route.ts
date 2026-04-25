import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../../../jobs/proxy';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  return proxyToFastAPI(`/targets/${id}/activate`, { method: 'POST' });
}
