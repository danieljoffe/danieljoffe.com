import * as Sentry from '@sentry/nextjs';
import { sentryEnabled, sharedSentryConfig } from '@/lib/sentry.config';

if (sentryEnabled) {
  Sentry.init({
    ...sharedSentryConfig,
    beforeSend(event) {
      event.tags = { ...event.tags, runtime: 'edge' };
      return event;
    },
  });
}
