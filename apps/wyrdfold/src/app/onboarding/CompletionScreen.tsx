'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '@danieljoffe.com/shared-ui/Card';
import { Text } from '@danieljoffe.com/shared-ui/Text';
import { Heading } from '@danieljoffe.com/shared-ui/Heading';
import Button from '@/components/Button';

export default function CompletionScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Mark onboarding complete server-side, then navigate. The completion
  // call is idempotent on the API, so a double-click or retry from a
  // network hiccup won't overwrite the original timestamp.
  //
  // If the completion call fails (network blip, API down) we still
  // navigate — the user has finished the wizard from their perspective,
  // and Sentry will catch the failure. The downside is the dashboard
  // gate will redirect them back here once; better than blocking the
  // happy path on a transient failure.
  const handleContinue = useCallback(async () => {
    setSubmitting(true);
    try {
      await fetch('/api/profile/onboarding/complete', { method: 'POST' });
    } catch {
      // Swallow — Sentry instrumentation covers this; navigation
      // proceeds so the user doesn't feel stuck.
    }
    router.push('/targets');
  }, [router]);

  return (
    <div className='flex flex-col items-center gap-6'>
      <Card padding='lg' className='w-full text-center'>
        <div className='flex flex-col items-center gap-4 py-4'>
          <div className='rounded-full bg-success/10 p-4'>
            <CheckCircle className='size-12 text-success' aria-hidden />
          </div>
          <div>
            <Heading variant='cardTitle' as='h2'>
              You&apos;re all set!
            </Heading>
            <Text variant='body' className='mt-2 text-text-secondary'>
              Your account is ready. Head to your targets to start tracking jobs
              and generating tailored resumes.
            </Text>
            <Text variant='caption' className='mt-3 text-text-tertiary'>
              WyrdFold sharpens as you mark which jobs you&apos;d actually apply
              to. A few rounds in, the matches start finding you.
            </Text>
          </div>
        </div>
      </Card>

      <Button
        name='onboarding-go-to-targets'
        variant='primary'
        size='lg'
        className='w-full justify-center'
        onClick={handleContinue}
        disabled={submitting}
      >
        {submitting ? (
          <>
            <Loader2 className='size-4 animate-spin' aria-hidden />
            <span>Finishing up…</span>
          </>
        ) : (
          <>
            <span>Go to Targets</span>
            <ArrowRight className='size-4' aria-hidden />
          </>
        )}
      </Button>
    </div>
  );
}
