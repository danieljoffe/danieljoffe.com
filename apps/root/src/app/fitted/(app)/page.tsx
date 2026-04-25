import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

export const metadata: Metadata = {
  title: 'Dashboard',
};

const JOB_API_URL = process.env['JOB_API_URL'] ?? '';
const JOB_API_KEY = process.env['JOB_API_KEY'] ?? '';

async function hasMasterDoc(): Promise<boolean> {
  if (!JOB_API_URL) return false;
  try {
    const res = await fetch(`${JOB_API_URL}/experience/optimized`, {
      headers: { 'x-api-key': JOB_API_KEY },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    // If backend is down, don't block the dashboard
    return true;
  }
}

export default async function FittedDashboard() {
  const supabase = await createAuthServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && !(await hasMasterDoc())) {
    redirect('/fitted/onboarding');
  }

  return (
    <div className='flex flex-col gap-6'>
      <div>
        <Heading variant='component' as='h1'>
          Dashboard
        </Heading>
        <Text variant='body' className='mt-1 text-text-secondary'>
          {user?.email
            ? `Welcome back, ${user.email}`
            : 'Your job applications at a glance'}
        </Text>
      </div>

      <Card className='p-8 text-center'>
        <Text variant='body' className='text-text-secondary'>
          No jobs tracked yet. Add your first job application to get started.
        </Text>
      </Card>
    </div>
  );
}
