import { type NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

// Resume docx style preset (preset + accent). No capability gating — unlike
// notifications, this never depends on operator-configured credentials.

export async function GET() {
  return proxyToWyrdfoldAPI('/profile/resume-style');
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  return proxyToWyrdfoldAPI('/profile/resume-style', {
    method: 'PATCH',
    body,
  });
}
