import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  // Body may be empty (explicit checkpoint with no flush) or contain
  // {markdown} for the sendBeacon flush case. Tolerate both.
  let body: unknown = null;
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {
    /* fall through with body null */
  }

  return proxyToWyrdfoldAPI(`/tailor/resumes/${id}/checkpoint`, {
    method: 'POST',
    ...(body ? { body } : {}),
  });
}
