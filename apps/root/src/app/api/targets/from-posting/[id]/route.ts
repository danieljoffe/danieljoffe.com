import { type NextRequest, NextResponse } from 'next/server';
import {
  verifyJobsAccess,
  proxyToFastAPI,
  LLM_TIMEOUT_MS,
} from '@/app/api/jobs/proxy';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  return proxyToFastAPI(`/targets/from-posting/${id}`, {
    method: 'POST',
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
