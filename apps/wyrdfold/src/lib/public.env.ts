const NEXT_PUBLIC_SENTRY_CONFIG_ID = process.env.NEXT_PUBLIC_SENTRY_CONFIG_ID;
const NEXT_PUBLIC_NODE_ENV = process.env.NODE_ENV ?? 'development';

export const publicEnv = {
  NEXT_PUBLIC_SENTRY_CONFIG_ID,
  NEXT_PUBLIC_NODE_ENV,
};
