import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET(request: NextRequest) {
  return proxyToWyrdfoldAPI('/experience/turns', {
    searchParams: request.nextUrl.searchParams,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToWyrdfoldAPI('/experience/turns', { method: 'POST', body });
}
