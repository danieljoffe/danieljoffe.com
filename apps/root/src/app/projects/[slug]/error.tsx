'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { PageContainer, Stack, Section } from '@danieljoffe.com/shared-ui';
import Button from '@/components/Button';
import { PROJECTS_LINK } from '@/utils/base';

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
    <Section className='min-h-min max-h-max'>
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
            There was an error loading this project page. Please try again.
          </p>
          <Stack direction='horizontal' gap='sm'>
            <button
              onClick={() => reset()}
              className='rounded-lg bg-accent px-6 py-3 text-accent-foreground hover:bg-accent/90'
            >
              Try again
            </button>
            <Button as='link' href={PROJECTS_LINK.href} variant='outline'>
              Back to Projects
            </Button>
          </Stack>
        </Stack>
      </PageContainer>
    </Section>
  );
}
