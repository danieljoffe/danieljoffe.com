import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/profile/identity');
}

export async function PATCH(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/profile/identity', {
    method: 'PATCH',
    body: parsed.body,
  });
}
