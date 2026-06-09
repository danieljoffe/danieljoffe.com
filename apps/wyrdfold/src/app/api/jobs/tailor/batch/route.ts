import type { NextRequest } from 'next/server';

import {
  LLM_TIMEOUT_MS,
  proxyToWyrdfoldAPI,
  readJsonBody,
} from '@/lib/api/proxy';

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/tailor/batch', {
    method: 'POST',
    body: parsed.body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
