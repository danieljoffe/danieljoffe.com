import { type NextRequest, NextResponse } from 'next/server';
import {
  LLM_TIMEOUT_MS,
  verifyJobsAccess,
  proxyToFastAPI,
} from '@/app/api/jobs/proxy';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  // LLM fit-score derivation can run long.
  return proxyToFastAPI(`/targets/${id}/link`, {
    method: 'POST',
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
