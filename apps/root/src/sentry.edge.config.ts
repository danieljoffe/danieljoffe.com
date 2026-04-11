// This file configures the initialization of Sentry for edge features (proxy, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { sentryEnabled, sharedSentryConfig } from '@/lib/sentry.config';

if (sentryEnabled) {
  Sentry.init({
    ...sharedSentryConfig,

    // Add edge runtime context to all events
    beforeSend(event) {
      event.tags = {
        ...event.tags,
        runtime: 'edge',
      };
      return event;
    },
  });
}
