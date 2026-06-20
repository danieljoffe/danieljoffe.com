// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { initBotId } from 'botid/client/core';
import { sentryEnabled } from '@/lib/sentry.config';
import { publicEnv } from '@/lib/public.env';
import { isProduction } from '@/utils/helpers';

if (sentryEnabled) {
  Sentry.init({
    dsn: publicEnv.NEXT_PUBLIC_SENTRY_CONFIG_ID as string,

    // Environment identification
    environment: publicEnv.NEXT_PUBLIC_NODE_ENV,

    // Sample 100% of errors, but only 10% of performance traces in production
    // to balance visibility with quota usage
    tracesSampleRate: isProduction() ? 0.1 : 1.0,

    // Sample rate for error events (1.0 = 100% of errors)
    sampleRate: 1.0,

    // Enable logs to be sent to Sentry
    enableLogs: true,

    // All heavy integrations are deferred below to avoid blocking LCP paint
    integrations: [],

    // Session Replay sampling
    replaysSessionSampleRate: isProduction() ? 0.1 : 0,
    replaysOnErrorSampleRate: 1.0, // Always capture replay when error occurs

    // Filter out noisy errors that aren't actionable
    ignoreErrors: [
      // Browser extensions
      /extensions\//i,
      /^chrome-extension:\/\//,
      /^moz-extension:\/\//,
      // Network errors that are often transient
      'Network request failed',
      'Failed to fetch',
      'Load failed',
      // ResizeObserver loop errors (browser quirk, not actionable)
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
    ],

    // Add custom context to all events
    beforeSend(event) {
      // Add page URL context
      if (typeof window !== 'undefined') {
        event.tags = {
          ...event.tags,
          'page.url': window.location.pathname,
          'page.referrer': document.referrer || 'direct',
        };
      }
      return event;
    },

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
  });

  // Defer heavy Sentry integrations to avoid blocking LCP and TTI.
  // browserTracingIntegration and replayIntegration are added after the page
  // becomes interactive, keeping the initial JS evaluation cost low.
  if (typeof window !== 'undefined') {
    const loadDeferredIntegrations = () => {
      Sentry.addIntegration(Sentry.browserTracingIntegration());
      Sentry.addIntegration(
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
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

initBotId({
  protect: [{ path: '/api/email/contact', method: 'POST' }],
});
