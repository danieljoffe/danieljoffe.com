import { redirect } from 'next/navigation';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { createAuthServerClient } from '@/lib/supabase/auth-server';
import FittedSignOut from './FittedSignOut';

export default async function FittedDashboard() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/fitted/login');
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] gap-6'>
      <Heading variant='component' as='h1'>
        Fitted
      </Heading>
      <Text variant='body'>
        Signed in as <span className='font-medium text-fg'>{user.email}</span>
      </Text>
      <FittedSignOut />
    </div>
  );
}
