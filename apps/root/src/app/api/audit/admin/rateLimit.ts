import { createRateLimiter } from '@/lib/rateLimit';
import { FORM_LIMITS } from '@/utils/constants';

const limiter = createRateLimiter({
  maxRequests: FORM_LIMITS.RATE_LIMIT_REQUESTS,
  windowMs: FORM_LIMITS.RATE_LIMIT_WINDOW_MS,
});

export const checkRateLimit = limiter.check;
export const resetRateLimit = limiter.reset;
