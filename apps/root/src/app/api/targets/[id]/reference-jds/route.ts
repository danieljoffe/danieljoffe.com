import { type NextRequest, NextResponse } from 'next/server';
import {
  LLM_TIMEOUT_MS,
  verifyJobsAccess,
  proxyToFastAPI,
} from '@/app/api/jobs/proxy';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  return proxyToFastAPI(`/targets/${id}/reference-jds`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  // LLM derive + merge can run long.
  return proxyToFastAPI(`/targets/${id}/reference-jds`, {
    method: 'POST',
    body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
