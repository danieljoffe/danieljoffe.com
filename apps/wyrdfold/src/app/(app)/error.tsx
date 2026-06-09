'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Card, CardContent } from '@danieljoffe/shared-ui/Card';
import { Heading } from '@danieljoffe/shared-ui/Heading';
import { Text } from '@danieljoffe/shared-ui/Text';
import Button from '@/components/Button';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope(scope => {
      scope.setTag('route', '/(app)');
      if (error.digest) {
        scope.setExtra('digest', error.digest);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <div className='flex flex-col gap-6'>
      <Heading variant='hero' as='h1'>
        Something went wrong
      </Heading>
      <Card>
        <CardContent className='flex flex-col items-center gap-4 py-12 text-center'>
          <Text variant='body' as='p' className='max-w-md'>
            This page failed to load. The error has been reported. Try again, or
            head back to your dashboard.
          </Text>
          <div className='flex gap-2'>
            <Button
              name='wyrdfold-error-retry'
              variant='primary'
              size='sm'
              onClick={() => reset()}
            >
              Try again
            </Button>
            <Button
              name='wyrdfold-error-home'
              variant='outline'
              size='sm'
              as='link'
              href='/dashboard'
            >
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
