import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/experience/optimized');
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/experience/optimized', {
    method: 'POST',
    body: parsed.body,
  });
}
