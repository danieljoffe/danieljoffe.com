import type { NextRequest } from 'next/server';

import { LLM_TIMEOUT_MS, proxyMultipartToWyrdfoldAPI } from '@/lib/api/proxy';

export async function POST(request: NextRequest) {
  const autoDerives =
    request.nextUrl.searchParams.get('auto_derive') === 'true';
  return proxyMultipartToWyrdfoldAPI('/experience/upload-resume', request, {
    searchParams: request.nextUrl.searchParams,
    ...(autoDerives ? { timeoutMs: LLM_TIMEOUT_MS } : {}),
  });
}
