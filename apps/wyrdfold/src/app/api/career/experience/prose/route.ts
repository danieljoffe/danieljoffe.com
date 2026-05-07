import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

export async function GET() {
  return proxyToWyrdfoldAPI('/experience/prose');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToWyrdfoldAPI('/experience/prose', { method: 'POST', body });
}
