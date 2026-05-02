import { NextResponse } from 'next/server';
import { proxyStreamingToFastAPI, getJobsAccess } from '@/app/api/jobs/proxy';
import { checkDeriveRateLimit, tooManyRequests } from '@/lib/llmRateLimit';

export async function POST(request: Request) {
  const access = await getJobsAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (access.kind === 'user') {
    const blocked = tooManyRequests(checkDeriveRateLimit(access.userId));
    if (blocked) return blocked;
  }

  return proxyStreamingToFastAPI('/experience/derive/stream', request, {
    method: 'POST',
  });
}
