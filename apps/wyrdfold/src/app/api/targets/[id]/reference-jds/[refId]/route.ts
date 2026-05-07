import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string; refId: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, refId } = await params;
  return proxyToWyrdfoldAPI(`/targets/${id}/reference-jds/${refId}`, {
    method: 'DELETE',
  });
}
