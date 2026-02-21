import { publicEnv } from '@/lib/public.env';
import { RESUME_URL } from './constants';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export const devLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'development') return;
  console.log(
    `%c${new Date().toISOString()} > ${message}`,
    'background-color: darkorange; color: black; font-weight: 600; padding: 5px;',
    ...args
  );
};

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
