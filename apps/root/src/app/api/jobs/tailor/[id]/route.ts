import { NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../../../proxy';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  return proxyToFastAPI(`/tailor/resumes/${id}`);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  return proxyToFastAPI(`/tailor/resumes/${id}`, { method: 'PATCH', body });
}
