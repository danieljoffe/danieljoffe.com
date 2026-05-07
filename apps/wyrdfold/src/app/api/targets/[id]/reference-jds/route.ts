import type { NextRequest } from 'next/server';

import { LLM_TIMEOUT_MS, proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/targets/${id}/reference-jds`);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  return proxyToWyrdfoldAPI(`/targets/${id}/reference-jds`, {
    method: 'POST',
    body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
