import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/experience/preferences');
}

export async function PUT(request: NextRequest) {
  const parsed = await readJsonBody(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/experience/preferences', {
    method: 'PUT',
    body: parsed.body,
  });
}

export async function DELETE() {
  return proxyToWyrdfoldAPI('/experience/preferences', { method: 'DELETE' });
}
