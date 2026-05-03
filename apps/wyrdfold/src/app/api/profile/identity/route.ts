import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/profile/identity');
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  return proxyToWyrdfoldAPI('/profile/identity', {
    method: 'PATCH',
    body,
  });
}
