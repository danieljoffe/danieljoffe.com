import { type NextRequest, NextResponse } from 'next/server';

import { LLM_TIMEOUT_MS, proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const targetId = request.nextUrl.searchParams.get('target_id');
  if (!targetId) {
    return NextResponse.json(
      { error: 'target_id query param required' },
      { status: 400 }
    );
  }

  return proxyToWyrdfoldAPI(`/analysis/${id}`, {
    method: 'POST',
    searchParams: new URLSearchParams({ target_id: targetId }),
    timeoutMs: LLM_TIMEOUT_MS,
  });
}
