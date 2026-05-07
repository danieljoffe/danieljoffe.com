import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

type SourceAction =
  | { action: 'add'; board_token: string; company_name: string }
  | { action: 'remove' | 'toggle'; board_token: string }
  | { action: 'seed' };

export async function GET() {
  return proxyToWyrdfoldAPI('/sources');
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as SourceAction;
  const path = body.action === 'seed' ? '/sources/seed' : '/sources';
  return proxyToWyrdfoldAPI(path, { method: 'POST', body });
}
