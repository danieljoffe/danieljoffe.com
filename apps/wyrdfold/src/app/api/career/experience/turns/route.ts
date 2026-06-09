import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

export async function GET(request: NextRequest) {
  return proxyToWyrdfoldAPI('/experience/turns', {
    searchParams: request.nextUrl.searchParams,
  });
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/experience/turns', {
    method: 'POST',
    body: parsed.body,
  });
}
