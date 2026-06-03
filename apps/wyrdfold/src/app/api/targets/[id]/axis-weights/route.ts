import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/targets/{id}/axis-weights — set per-axis weights for the
 * Phase 2 four-axis scorecard. Snapshots the prior value so /undo can
 * revert. Returns the updated UserTarget row.
 *
 * DELETE — reset to defaults (NULL on the DB column → equal quartile
 * read-time blend). Also snapshots, so /undo recovers the prior custom
 * weights.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  return proxyToWyrdfoldAPI(`/targets/${id}/axis-weights`, {
    method: 'PATCH',
    body,
  });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/targets/${id}/axis-weights`, {
    method: 'DELETE',
  });
}
