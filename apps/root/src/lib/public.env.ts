import { devLog } from '@/utils/helpers';

const NEXT_PUBLIC_HCAPTCHA_SITE_ID = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_ID;
const NEXT_PUBLIC_GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID;
const NEXT_PUBLIC_SENTRY_CONFIG_ID = process.env.NEXT_PUBLIC_SENTRY_CONFIG_ID;
const NEXT_PUBLIC_NODE_ENV = process.env.NODE_ENV ?? 'development';

export const publicEnv = {
  NEXT_PUBLIC_HCAPTCHA_SITE_ID,
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  NEXT_PUBLIC_SENTRY_CONFIG_ID,
  NEXT_PUBLIC_NODE_ENV,
};

function validatePublicEnv() {
  Object.entries(publicEnv).forEach(([key, value]) => {
    if (value == null) {
      devLog(`Missing required environment variable: ${key}`);
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}

validatePublicEnv();
