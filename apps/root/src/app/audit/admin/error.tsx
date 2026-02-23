'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button, PageContainer, Stack } from '@danieljoffe.com/shared-ui';
import AppButton from '@/components/Button';
import { HOME_LINK } from '@/utils/constants';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope(scope => {
      scope.setTag('route', '/audit/admin');
      if (error.digest) {
        scope.setExtra('digest', error.digest);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <PageContainer>
      <Stack
        direction='vertical'
        align='center'
        justify='center'
        gap='md'
        className='min-h-[60vh] text-center'
      >
        <h2>Something went wrong</h2>
        <p className='text-foreground-muted max-w-md'>
          There was an error loading the admin dashboard. Please try again.
        </p>
        <Stack direction='horizontal' gap='sm'>
          <Button onClick={() => reset()} variant='primary'>
            Try again
          </Button>
          <AppButton as='link' href={HOME_LINK.href} variant='outline'>
            Back to Home
          </AppButton>
        </Stack>
      </Stack>
    </PageContainer>
  );
}
