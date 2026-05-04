import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import OnboardingWizard from './OnboardingWizard';

export const metadata: Metadata = {
  title: 'Get Started',
};

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
