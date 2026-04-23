import { createRateLimiter } from '@/lib/rateLimit';

export { extractClientIp } from '@/lib/rateLimit';

const limiter = createRateLimiter({
  maxRequests: 30,
  windowMs: 60_000,
});

export const checkInsightsRateLimit = limiter.check;
export const resetInsightsRateLimit = limiter.reset;
