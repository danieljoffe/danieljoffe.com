import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import OnboardingWizard from './OnboardingWizard';

export const metadata: Metadata = {
  title: 'Get Started',
};

// Outside the (app) route group, so the layout's force-dynamic doesn't apply
// here. Required because createAuthServerClient throws when env vars are
// missing (CI builds), which happens before cookies() can mark the route
// dynamic.
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <OnboardingWizard />;
}
