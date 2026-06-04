import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

// Onboarding completion + step tracking. Backed by /profile/onboarding
// on wyrdfold-api. The dashboard server component reads this to decide
// whether to bounce a brand-new user into /onboarding.
//
// See plan-wyrdfold-onboarding-completion-tracking.md.

export async function GET() {
  return proxyToWyrdfoldAPI('/profile/onboarding');
}
