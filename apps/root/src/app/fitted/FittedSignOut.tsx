'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { createAuthBrowserClient } from '@/lib/supabase/auth-client';

export default function FittedSignOut() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createAuthBrowserClient();
    await supabase.auth.signOut();
    router.replace('/fitted/login');
    router.refresh();
  }

  return (
    <Button name='fitted-sign-out' variant='secondary' onClick={handleSignOut}>
      Sign out
    </Button>
  );
}
