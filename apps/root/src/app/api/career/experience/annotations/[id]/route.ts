import { NextResponse } from 'next/server';
import { proxyToFastAPI, verifyJobsAccess } from '@/app/api/jobs/proxy';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  return proxyToFastAPI(`/experience/annotations/${id}`, {
    method: 'DELETE',
  });
}
