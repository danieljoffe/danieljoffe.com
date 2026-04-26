import { type NextRequest, NextResponse } from 'next/server';
import {
  verifyJobsAccess,
  proxyMultipartToFastAPI,
  LLM_TIMEOUT_MS,
} from '@/app/api/jobs/proxy';

export async function POST(request: NextRequest) {
  if (!(await verifyJobsAccess())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const autoDerives =
    request.nextUrl.searchParams.get('auto_derive') === 'true';
  return proxyMultipartToFastAPI('/experience/upload-resume', request, {
    searchParams: request.nextUrl.searchParams,
    timeoutMs: autoDerives ? LLM_TIMEOUT_MS : undefined,
  });
}
