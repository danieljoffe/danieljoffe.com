import { devLog } from '@/utils/helpers';

export enum PublicEnvVars {
  NEXT_PUBLIC_HCAPTCHA_SITE_ID = 'NEXT_PUBLIC_HCAPTCHA_SITE_ID',
  NEXT_PUBLIC_GOOGLE_ANALYTICS_ID = 'NEXT_PUBLIC_GOOGLE_ANALYTICS_ID',
  NEXT_PUBLIC_SENTRY_CONFIG_ID = 'NEXT_PUBLIC_SENTRY_CONFIG_ID',
  NEXT_PUBLIC_NODE_ENV = 'NEXT_PUBLIC_NODE_ENV',
}

export const publicEnv: Record<PublicEnvVars, string | undefined> = {
  [PublicEnvVars.NEXT_PUBLIC_HCAPTCHA_SITE_ID]:
    process.env.NEXT_PUBLIC_HCAPTCHA_SITE_ID,
  [PublicEnvVars.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID]:
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID,
  [PublicEnvVars.NEXT_PUBLIC_SENTRY_CONFIG_ID]:
    process.env.NEXT_PUBLIC_SENTRY_CONFIG_ID,
  [PublicEnvVars.NEXT_PUBLIC_NODE_ENV]: process.env.NODE_ENV ?? 'development',
};

function validatePublicEnv() {
  Object.entries(PublicEnvVars).forEach(([varName, varValue]) => {
    if (varValue == null) {
      devLog(`Missing required environment variable: ${varName}`);
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
}

validatePublicEnv();
