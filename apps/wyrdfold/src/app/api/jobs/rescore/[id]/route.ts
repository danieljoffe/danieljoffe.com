import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/jobs/rescore/${id}`, { method: 'POST' });
}
