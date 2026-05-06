'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

// Mirrors apps/root/src/app/global-error.tsx. Renders outside the app
// tree (no Tailwind, no shared-ui, no providers) so we use inline styles.
// Only fires when the root layout itself throws — providers, theme load, etc.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.withScope(scope => {
      scope.setLevel('fatal');
      scope.setTag('error.boundary', 'global');
      if (error.digest) {
        scope.setExtra('digest', error.digest);
      }
      Sentry.captureException(error);
    });
  }, [error]);

  return (
    <html lang='en'>
      <body
        style={{
          margin: 0,
          backgroundColor: '#0c0e0f',
          color: '#f4f4f3',
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '1rem',
          }}
        >
          <h2>Something went wrong.</h2>
          <p
            style={{
              color: '#9ca3af',
              maxWidth: '24rem',
              textAlign: 'center',
            }}
          >
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#a8e60b',
              color: '#0c0e0f',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
