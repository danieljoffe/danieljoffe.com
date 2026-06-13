import { publicEnv } from '@/lib/public.env';
import { RESUME_URL } from './constants';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function devLog(message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV !== 'development') return;

  const timestamp = new Date().toLocaleTimeString();
  console.debug(
    `\x1b[90m[${timestamp}]\x1b[0m \x1b[36mDEBUG\x1b[0m ${message}`,
    ...args
  );
}

// ============================================================================
// ENVIRONMENT VALIDATION (runs at module load time)
// ============================================================================

function warnMissingEnv(env: Record<string, unknown>) {
  const missing = Object.entries(env)
    .filter(([, value]) => value == null)
    .map(([key]) => key);

  if (missing.length === 0) return;

  // Features gate themselves on these values (e.g. sentryEnabled), so a
  // missing key degrades that feature instead of crashing the dev server.
  console.warn(
    `\x1b[33m⚠ Missing environment variable(s): ${missing.join(', ')}.\x1b[0m\n` +
      '  Dependent features are disabled for this session. ' +
      'Copy apps/root/.env.example to apps/root/.env.local to enable them.'
  );
}

function validatePublicEnv() {
  if (process.env.NODE_ENV !== 'development') return;

  warnMissingEnv(publicEnv);
}

function validateEnv() {
  // Server env vars are only available on the server
  if (typeof window !== 'undefined') return;
  if (process.env.NODE_ENV !== 'development') return;

  // Lazy import to avoid pulling server-only env into the client bundle
  const { serverEnv } = require('@/lib/env') as typeof import('@/lib/env');

  warnMissingEnv(serverEnv);
}

validatePublicEnv();
validateEnv();

// ============================================================================
// ENVIRONMENT UTILITIES
// ============================================================================

export const isProduction = () => {
  return publicEnv.NEXT_PUBLIC_NODE_ENV === 'production';
};

interface ClickDownloadOptions {
  href: string;
  download: string;
}

const onClickDownload = (options: ClickDownloadOptions) => () => {
  const link = document.createElement('a');
  link.href = options.href;
  link.download = options.download;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadResume = onClickDownload({
  download: 'daniel-joffe-resume.pdf',
  href: RESUME_URL,
});
