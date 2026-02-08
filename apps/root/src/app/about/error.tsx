'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { PageContainer, Stack } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import { HOME_LINK } from '@/utils/base';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
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
          There was an error loading this page. Please try again.
        </p>
        <Stack direction='horizontal' gap='sm'>
          <button
            onClick={() => reset()}
            className='rounded-lg bg-primary px-6 py-3 text-white hover:bg-primary/90'
          >
            Try again
          </button>
          <Button as='link' href={HOME_LINK.href} variant='outline'>
            Back to Home
          </Button>
        </Stack>
      </Stack>
    </PageContainer>
  );
}
