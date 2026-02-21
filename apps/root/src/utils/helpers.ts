import { publicEnv } from '@/lib/public.env';
import { RESUME_URL } from './constants';
import { serverEnv } from '@/lib/env';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function devLog(message: string, ...args: unknown[]) {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(
    `%c${new Date().toISOString()} > ${message}`,
    'background-color: darkorange; color: black; font-weight: 600; padding: 5px;',
    ...args
  );
}

// ============================================================================
// ENVIRONMENT VALIDATION (runs at module load time)
// ============================================================================

function validatePublicEnv() {
  // Only validate in development to catch misconfigurations early
  if (process.env.NODE_ENV !== 'development') return;

  Object.entries(publicEnv).forEach(([key, value]) => {
    if (value == null) {
      devLog(`Missing required environment variable: ${key}`);
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}

function validateEnv() {
  // Server env vars are only available on the server
  if (typeof window !== 'undefined') return;
  // Only validate in development to catch misconfigurations early
  if (process.env.NODE_ENV !== 'development') return;

  Object.entries(serverEnv).forEach(([key, value]) => {
    if (value == null) {
      devLog(`Missing required environment variable: ${key}`);
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
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
