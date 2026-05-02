import { NextResponse } from 'next/server';
import {
  getJobsAccess,
  proxyToFastAPI,
  LLM_TIMEOUT_MS,
} from '@/app/api/jobs/proxy';
import { checkTailorRateLimit, tooManyRequests } from '@/lib/llmRateLimit';

export async function POST(request: Request) {
  const access = await getJobsAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (access.kind === 'user') {
    const blocked = tooManyRequests(checkTailorRateLimit(access.userId));
    if (blocked) return blocked;
  }

  const body = await request.json();
  return proxyToFastAPI('/tailor/resume', {
    method: 'POST',
    body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
