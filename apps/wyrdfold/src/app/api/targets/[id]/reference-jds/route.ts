import type { NextRequest } from 'next/server';

import {
  LLM_TIMEOUT_MS,
  proxyToWyrdfoldAPI,
  readJsonBody,
} from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/targets/${id}/reference-jds`);
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI(`/targets/${id}/reference-jds`, {
    method: 'POST',
    body: parsed.body,
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
