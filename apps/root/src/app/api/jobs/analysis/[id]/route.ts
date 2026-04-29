import { NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '@/app/api/jobs/proxy';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const targetId = new URL(request.url).searchParams.get('target_id');
  if (!targetId) {
    return NextResponse.json(
      { error: 'target_id query param required' },
      { status: 400 }
    );
  }

  return proxyToFastAPI(`/analysis/${id}`, {
    method: 'POST',
    searchParams: new URLSearchParams({ target_id: targetId }),
  });
}
