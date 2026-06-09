import type { NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

type SourceAction =
  | { action: 'add'; board_token: string; company_name: string }
  | { action: 'remove' | 'toggle'; board_token: string }
  | { action: 'seed' };

export async function GET() {
  return proxyToWyrdfoldAPI('/sources');
}

export async function POST(request: NextRequest) {
  const parsed = await readJsonBody<SourceAction>(request);
  if (!parsed.ok) return parsed.response;
  const path = parsed.body.action === 'seed' ? '/sources/seed' : '/sources';
  return proxyToWyrdfoldAPI(path, { method: 'POST', body: parsed.body });
}
