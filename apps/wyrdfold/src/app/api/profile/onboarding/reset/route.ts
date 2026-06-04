import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

// POST /api/profile/onboarding/reset — clear the user's onboarding
// completion + step state. Used by the Settings page "Redo onboarding"
// button. Idempotent; never deletes user data.

export async function POST() {
  return proxyToWyrdfoldAPI('/profile/onboarding/reset', { method: 'POST' });
}
