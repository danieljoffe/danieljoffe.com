import { FORM_LIMITS } from '@/utils/constants';

const MAX_ATTEMPTS = FORM_LIMITS.RATE_LIMIT_REQUESTS;
const WINDOW_MS = FORM_LIMITS.RATE_LIMIT_WINDOW_MS;

interface AttemptEntry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptEntry>();

export function checkRateLimit(ip: string): {
  blocked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const entry = attempts.get(ip);

  // Expired or first attempt — start fresh window
  if (!entry || now >= entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false, retryAfterSeconds: 0 };
  }

  entry.count++;

  if (entry.count > MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false, retryAfterSeconds: 0 };
}

export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}
