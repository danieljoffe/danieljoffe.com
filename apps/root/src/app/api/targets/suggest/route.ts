import { NextResponse } from 'next/server';
import {
  verifyJobsAccess,
  proxyToFastAPI,
  LLM_TIMEOUT_MS,
} from '@/app/api/jobs/proxy';

export async function POST() {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return proxyToFastAPI('/targets/suggest', {
    method: 'POST',
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
