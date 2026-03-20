'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Button from '@/components/Button';
import { HOME_LINK } from '@/utils/constants';

export default function RouteError({
  error,
  reset,
  route,
  description = 'There was an error loading this page. Please try again.',
}: {
  error: Error & { digest?: string };
  reset: () => void;
  route: string;
  description?: string;
}) {
  useEffect(() => {
    Sentry.withScope(scope => {
      scope.setTag('route', route);
      if (error.digest) {
        scope.setExtra('digest', error.digest);
      }
      Sentry.captureException(error);
    });
  }, [error, route]);

  return (
    <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
      <div className='flex flex-col items-center justify-center gap-4 min-h-[60vh] text-center'>
        <h2>Something went wrong</h2>
        <p className='text-text-secondary max-w-md'>{description}</p>
        <div className='flex flex-row gap-2'>
          <Button variant='primary' onClick={() => reset()} name='retry'>
            Try again
          </Button>
          <Button as='link' variant='outline' href={HOME_LINK.href}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
