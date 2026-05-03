import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/targets');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToWyrdfoldAPI('/targets', { method: 'POST', body });
}
