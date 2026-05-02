// CSP allow-list for WyrdFold. Trimmed from root: no hCaptcha/Calendly/
// Storybook iframes since the admin app doesn't embed them.

const SUPABASE_STORAGE_URL = 'https://*.supabase.co';
const SENTRY_URL = 'https://*.sentry.io';
const SENTRY_INGEST_URL = 'https://*.ingest.sentry.io';

export const allowedImageOrigins = [SUPABASE_STORAGE_URL];

export const allowedOrigins = [
  ...allowedImageOrigins,
  SENTRY_URL,
  SENTRY_INGEST_URL,
];
