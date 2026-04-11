/**
 * Shared Sentry configuration for server and edge runtimes.
 */

import type * as Sentry from '@sentry/nextjs';
import { publicEnv } from '@/lib/public.env';
import { isProduction } from '@/utils/helpers';

export const sentryEnabled = !!publicEnv.NEXT_PUBLIC_SENTRY_CONFIG_ID;

export const sharedSentryConfig: Parameters<typeof Sentry.init>[0] = {
  dsn: publicEnv.NEXT_PUBLIC_SENTRY_CONFIG_ID as string,

  // Environment identification
  environment: publicEnv.NEXT_PUBLIC_NODE_ENV,

  // Sample 100% of errors, but only 10% of performance traces in production
  tracesSampleRate: isProduction() ? 0.1 : 1.0,

  // Sample rate for error events (1.0 = 100% of errors)
  sampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Filter out noisy errors
  ignoreErrors: [
    // Next.js internal errors that aren't actionable
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
  ],

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
};
