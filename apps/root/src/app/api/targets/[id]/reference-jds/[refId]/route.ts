import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '@/app/api/jobs/proxy';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; refId: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id, refId } = await params;
  return proxyToFastAPI(`/targets/${id}/reference-jds/${refId}`, {
    method: 'DELETE',
  });
}
