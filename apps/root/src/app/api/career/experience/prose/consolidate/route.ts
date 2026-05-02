import { NextResponse } from 'next/server';
import {
  LLM_TIMEOUT_MS,
  proxyToFastAPI,
  verifyJobsAccess,
} from '@/app/api/jobs/proxy';

export async function POST() {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/experience/prose/consolidate', {
    method: 'POST',
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
