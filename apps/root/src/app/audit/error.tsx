'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import Link from 'next/link';
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
      scope.setTag('route', '/audit');
      if (error.digest) {
        scope.setExtra('digest', error.digest);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <div className='max-w-3xl mx-auto w-full px-4 sm:px-6'>
      <div className='flex flex-col items-center justify-center gap-4 min-h-[60vh] text-center'>
        <h2>Something went wrong</h2>
        <p className='text-text-secondary max-w-md'>
          There was an error loading this page. Please try again.
        </p>
        <div className='flex flex-row gap-2'>
          <button
            onClick={() => reset()}
            className='inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface hover:cursor-pointer bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 px-4 py-3'
          >
            Try again
          </button>
          <Link
            href={HOME_LINK.href}
            className='inline-flex items-center justify-center gap-2 rounded-md transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface border border-border-secondary text-text-primary hover:bg-surface-elevated px-4 py-3'
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
