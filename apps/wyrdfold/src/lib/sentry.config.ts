import type * as Sentry from '@sentry/nextjs';
import { publicEnv } from '@/lib/public.env';
import { isProduction } from '@/utils/helpers';

export const sentryEnabled = !!publicEnv.NEXT_PUBLIC_SENTRY_CONFIG_ID;

export const sharedSentryConfig: Parameters<typeof Sentry.init>[0] = {
  dsn: publicEnv.NEXT_PUBLIC_SENTRY_CONFIG_ID as string,
  environment: publicEnv.NEXT_PUBLIC_NODE_ENV,
  tracesSampleRate: isProduction() ? 0.1 : 1.0,
  sampleRate: 1.0,
  enableLogs: true,
  ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
  debug: false,
};
