import { type NextRequest, NextResponse } from 'next/server';
import {
  getJobsAccess,
  proxyMultipartToFastAPI,
  LLM_TIMEOUT_MS,
} from '@/app/api/jobs/proxy';
import { checkUploadRateLimit, tooManyRequests } from '@/lib/llmRateLimit';

export async function POST(request: NextRequest) {
  const access = await getJobsAccess();
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (access.kind === 'user') {
    const blocked = tooManyRequests(checkUploadRateLimit(access.userId));
    if (blocked) return blocked;
  }

  const autoDerives =
    request.nextUrl.searchParams.get('auto_derive') === 'true';
  return proxyMultipartToFastAPI('/experience/upload-resume', request, {
    searchParams: request.nextUrl.searchParams,
    timeoutMs: autoDerives ? LLM_TIMEOUT_MS : undefined,
  });
}
