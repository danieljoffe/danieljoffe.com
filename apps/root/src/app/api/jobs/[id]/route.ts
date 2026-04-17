import { NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI, IS_MOCK_MODE } from '../proxy';
import { deleteMockPosting } from '../mockData';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  if (IS_MOCK_MODE) {
    const deleted = deleteMockPosting(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Posting not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, deleted_id: id });
  }

  return proxyToFastAPI(`/jobs/${id}`, { method: 'DELETE' });
}
