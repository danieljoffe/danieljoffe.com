// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { sentryEnabled, sharedSentryConfig } from '@/lib/sentry.config';

if (sentryEnabled) {
  Sentry.init({
    ...sharedSentryConfig,

    // Add server-side context to all events
    beforeSend(event) {
      event.tags = {
        ...event.tags,
        runtime: 'nodejs',
      };
      return event;
    },
  });
}
