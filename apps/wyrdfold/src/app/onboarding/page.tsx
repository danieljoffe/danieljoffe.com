import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import OnboardingWizard from './OnboardingWizard';

export const metadata: Metadata = {
  title: 'Get Started',
};

// Dynamic-rendering boundary is now signalled by `await connection()` inside
// createAuthServerClient (see lib/supabase/auth-server.ts), so the explicit
// force-dynamic export is no longer required.

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
