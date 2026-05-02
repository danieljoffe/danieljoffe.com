import { NextResponse } from 'next/server';
import { createRateLimiter } from './rateLimit';

// Per-user limits sized for LLM cost on a personal-use tool. Numbers
// are generous for legitimate authenticated use but tight enough to
// stop runaway loops and bound bills if a credential leaks.
//
// Keys are Supabase user_ids (not IPs) — multiple users can share an
// IP, and a single user across devices should still hit one budget.

const HOUR_MS = 60 * 60 * 1_000;

const tailorLimiter = createRateLimiter({
  maxRequests: 30,
  windowMs: HOUR_MS,
});

const deriveLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: HOUR_MS,
});

const uploadLimiter = createRateLimiter({
  maxRequests: 10,
  windowMs: HOUR_MS,
});

export const checkTailorRateLimit = tailorLimiter.check;
export const checkDeriveRateLimit = deriveLimiter.check;
export const checkUploadRateLimit = uploadLimiter.check;

export const resetTailorRateLimit = tailorLimiter.reset;
export const resetDeriveRateLimit = deriveLimiter.reset;
export const resetUploadRateLimit = uploadLimiter.reset;

/**
 * Build a 429 response from a blocked rate-limit result. Returns
 * `null` when the request is within budget so callers can early-exit
 * with one expression: `return tooManyRequests(rate) ?? handler();`.
 */
export function tooManyRequests(
  rate: { blocked: boolean; retryAfterSeconds: number },
  message = 'Too many requests'
): NextResponse | null {
  if (!rate.blocked) return null;
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfterSeconds) },
    }
  );
}
