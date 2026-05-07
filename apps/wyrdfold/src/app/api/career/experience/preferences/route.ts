import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/experience/preferences');
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  return proxyToWyrdfoldAPI('/experience/preferences', {
    method: 'PUT',
    body,
  });
}

export async function DELETE() {
  return proxyToWyrdfoldAPI('/experience/preferences', { method: 'DELETE' });
}
