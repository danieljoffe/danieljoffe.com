import { devLog } from '@/utils/helpers';

export enum RequiredEnvVars {
  VALIDKIT_API_KEY = 'VALIDKIT_API_KEY',
  WEB3FORMS_ACCESS_KEY = 'WEB3FORMS_ACCESS_KEY',
  VALIDKIT_API_URL = 'VALIDKIT_API_URL',
  WEB3FORMS_API_URL = 'WEB3FORMS_API_URL',
  NODE_ENV = 'NODE_ENV',
}

export const serverEnv: Record<RequiredEnvVars, string | undefined> = {
  VALIDKIT_API_KEY: process.env.VALIDKIT_API_KEY,
  WEB3FORMS_ACCESS_KEY: process.env.WEB3FORMS_ACCESS_KEY,
  VALIDKIT_API_URL: process.env.VALIDKIT_API_URL,
  WEB3FORMS_API_URL: process.env.WEB3FORMS_API_URL,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
};

function validateEnv() {
  // Skip validation in test/CI environments
  if (process.env.NODE_ENV === 'test' || process.env.CI) return;

  Object.entries(RequiredEnvVars).forEach(([varName, varValue]) => {
    if (varValue == null) {
      devLog(`Missing required environment variable: ${varName}`);
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
}

validateEnv();
