import type { NextRequest } from 'next/server';

import { LLM_TIMEOUT_MS, proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToWyrdfoldAPI('/targets/from-manual', {
    method: 'POST',
    body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
