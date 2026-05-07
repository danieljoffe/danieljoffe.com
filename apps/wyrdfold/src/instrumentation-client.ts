import * as Sentry from '@sentry/nextjs';
import { sentryEnabled } from '@/lib/sentry.config';
import { publicEnv } from '@/lib/public.env';
import { isProduction } from '@/utils/helpers';

if (sentryEnabled) {
  Sentry.init({
    dsn: publicEnv.NEXT_PUBLIC_SENTRY_CONFIG_ID as string,
    environment: publicEnv.NEXT_PUBLIC_NODE_ENV,
    tracesSampleRate: isProduction() ? 0.1 : 1.0,
    sampleRate: 1.0,
    enableLogs: true,

    // Heavy integrations are deferred below to avoid blocking LCP
    integrations: [],

    replaysSessionSampleRate: isProduction() ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0,

    ignoreErrors: [
      /extensions\//i,
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    beforeSend(event) {
      if (typeof window !== 'undefined') {
        event.tags = {
          ...event.tags,
          'page.url': window.location.pathname,
          'page.referrer': document.referrer || 'direct',
        };
      }
      return event;
    },

    debug: false,
  });

  if (typeof window !== 'undefined') {
    const loadDeferredIntegrations = () => {
      Sentry.addIntegration(Sentry.browserTracingIntegration());
      // maskAllText: true is critical for WyrdFold — resume content,
      // job descriptions, and tailoring prompts contain PII and secrets
      // that must not leak into Sentry replay payloads.
      Sentry.addIntegration(
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        })
      );
    };

    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(loadDeferredIntegrations);
    } else {
      setTimeout(loadDeferredIntegrations, 0);
    }
  }
}

export const onRouterTransitionStart = sentryEnabled
  ? Sentry.captureRouterTransitionStart
  : undefined;
