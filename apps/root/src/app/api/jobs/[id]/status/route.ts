import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI, IS_MOCK_MODE } from '../../proxy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  if (IS_MOCK_MODE) {
    return NextResponse.json({
      success: true,
      old_status: 'new',
      new_status: body.status,
    });
  }

  return proxyToFastAPI(`/jobs/${id}/status`, { method: 'POST', body });
}
