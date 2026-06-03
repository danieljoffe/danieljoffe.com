import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/targets/{id}/axis-weights/undo — swap `axis_weights` with
 * `axis_weights_previous`. Two consecutive undos toggle back and forth.
 */
export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/targets/${id}/axis-weights/undo`, {
    method: 'POST',
  });
}
