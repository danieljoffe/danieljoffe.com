import { type NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

// Resume docx style preset (preset + accent). No capability gating — unlike
// notifications, this never depends on operator-configured credentials.

export async function GET() {
  return proxyToWyrdfoldAPI('/profile/resume-style');
}

export async function PATCH(request: NextRequest) {
  const parsed = await readJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/profile/resume-style', {
    method: 'PATCH',
    body: parsed.body,
  });
}
