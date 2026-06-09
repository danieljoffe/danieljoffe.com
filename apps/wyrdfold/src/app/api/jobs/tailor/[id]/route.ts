import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToWyrdfoldAPI(`/tailor/resumes/${id}`);
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI(`/tailor/resumes/${id}`, {
    method: 'PATCH',
    body: parsed.body,
  });
}
