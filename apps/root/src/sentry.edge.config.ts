// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import { publicEnv, PublicEnvVars } from '@/lib/public.env';
import * as Sentry from '@sentry/nextjs';

const isProduction =
  publicEnv[PublicEnvVars.NEXT_PUBLIC_NODE_ENV] === 'production';

Sentry.init({
  dsn: publicEnv[PublicEnvVars.NEXT_PUBLIC_SENTRY_CONFIG_ID] as string,

  // Environment identification
  environment: publicEnv[PublicEnvVars.NEXT_PUBLIC_NODE_ENV] || 'development',

  // Sample 100% of errors, but only 10% of performance traces in production
  tracesSampleRate: isProduction ? 0.1 : 1.0,

  // Sample rate for error events (1.0 = 100% of errors)
  sampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Add edge runtime context to all events
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      runtime: 'edge',
    };
    return event;
  },

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
