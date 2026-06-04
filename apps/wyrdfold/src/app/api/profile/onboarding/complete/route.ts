import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

// POST /api/profile/onboarding/complete — mark the user's onboarding
// as complete. Idempotent (server preserves the original timestamp).
// Wizard calls this from the CompletionScreen "Continue to dashboard"
// button.

export async function POST() {
  return proxyToWyrdfoldAPI('/profile/onboarding/complete', {
    method: 'POST',
  });
}
