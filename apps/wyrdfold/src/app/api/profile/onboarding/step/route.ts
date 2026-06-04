import { type NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

// PATCH /api/profile/onboarding/step — update the wizard's current_step
// and/or path. Wizard calls this on every step transition.

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  return proxyToWyrdfoldAPI('/profile/onboarding/step', {
    method: 'PATCH',
    body,
  });
}
