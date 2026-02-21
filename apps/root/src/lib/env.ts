import { devLog } from '@/utils/helpers';

const VALIDKIT_API_KEY = process.env.VALIDKIT_API_KEY;
const WEB3FORMS_ACCESS_KEY = process.env.WEB3FORMS_ACCESS_KEY;
const VALIDKIT_API_URL = process.env.VALIDKIT_API_URL;
const WEB3FORMS_API_URL = process.env.WEB3FORMS_API_URL;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const serverEnv = {
  VALIDKIT_API_KEY,
  WEB3FORMS_ACCESS_KEY,
  VALIDKIT_API_URL,
  WEB3FORMS_API_URL,
  NODE_ENV,
};

function validateEnv() {
  // Skip validation in test/CI environments
  if (process.env.NODE_ENV === 'test' || process.env.CI) return;

  Object.entries(serverEnv).forEach(([key, value]) => {
    if (value == null) {
      devLog(`Missing required environment variable: ${key}`);
      throw new Error(`Missing required environment variable: ${key}`);
    }
  });
}

validateEnv();
