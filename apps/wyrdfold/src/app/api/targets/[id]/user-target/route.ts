import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/targets/{id}/user-target — return the current user's
 * user_targets row for this target, paired with the shared target data.
 *
 * Replaces the previous "fetch all /targets/mine and find the matching
 * row" pattern used by the axis-weights editor. One round-trip, no
 * over-fetch as a user accumulates targets.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/targets/${id}/user-target`, {
    method: 'GET',
  });
}
