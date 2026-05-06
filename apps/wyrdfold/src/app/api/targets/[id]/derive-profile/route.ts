import type { NextRequest } from 'next/server';

import { LLM_TIMEOUT_MS, proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/targets/${id}/derive-profile`, {
    method: 'POST',
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
