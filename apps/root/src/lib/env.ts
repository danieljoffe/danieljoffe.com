const VALIDKIT_API_KEY = process.env.VALIDKIT_API_KEY;
const VALIDKIT_API_URL = process.env.VALIDKIT_API_URL;
const NODE_ENV = process.env.NODE_ENV ?? 'development';

export const serverEnv = {
  VALIDKIT_API_KEY,
  VALIDKIT_API_URL,
  NODE_ENV,
};
