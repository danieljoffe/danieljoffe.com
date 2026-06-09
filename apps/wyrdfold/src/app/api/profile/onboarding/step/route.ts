import { type NextRequest } from 'next/server';

import { proxyToWyrdfoldAPI, readJsonBody } from '@/lib/api/proxy';

// PATCH /api/profile/onboarding/step — update the wizard's current_step
// and/or path. Wizard calls this on every step transition.

export async function PATCH(request: NextRequest) {
  const parsed = await readJsonBody<Record<string, unknown>>(request);
  if (!parsed.ok) return parsed.response;
  return proxyToWyrdfoldAPI('/profile/onboarding/step', {
    method: 'PATCH',
    body: parsed.body,
  });
}
