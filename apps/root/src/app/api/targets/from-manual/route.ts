import { type NextRequest, NextResponse } from 'next/server';
import {
  LLM_TIMEOUT_MS,
  verifyJobsAccess,
  proxyToFastAPI,
} from '@/app/api/jobs/proxy';

export async function POST(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = await request.json();
  // LLM normalize + (optional) derive profile + fit score.
  return proxyToFastAPI('/targets/from-manual', {
    method: 'POST',
    body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
