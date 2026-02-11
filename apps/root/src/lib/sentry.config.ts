/**
 * Shared Sentry configuration for server and edge runtimes.
 */

import { publicEnv, PublicEnvVars } from '@/lib/public.env';
import type * as Sentry from '@sentry/nextjs';

const isProduction =
  publicEnv[PublicEnvVars.NEXT_PUBLIC_NODE_ENV] === 'production';

export const sharedSentryConfig: Parameters<typeof Sentry.init>[0] = {
  dsn: publicEnv[PublicEnvVars.NEXT_PUBLIC_SENTRY_CONFIG_ID] as string,

  // Environment identification
  environment: publicEnv[PublicEnvVars.NEXT_PUBLIC_NODE_ENV] || 'development',

  // Sample 100% of errors, but only 10% of performance traces in production
  tracesSampleRate: isProduction ? 0.1 : 1.0,

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
