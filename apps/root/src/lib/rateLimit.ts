interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
  /** Maximum tracked IPs before oldest entries are evicted. Default: 10 000 */
  maxTrackedIps?: number | undefined;
  /** How often expired entries are swept. Default: same as windowMs */
  sweepIntervalMs?: number | undefined;
}

interface RateLimitResult {
  blocked: boolean;
  retryAfterSeconds: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

interface RateLimiter {
  check(ip: string): RateLimitResult;
  reset(ip?: string): void;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const {
    maxRequests,
    windowMs,
    maxTrackedIps = 10_000,
    sweepIntervalMs = windowMs,
  } = opts;

  const attempts = new Map<string, Entry>();
  let lastSweep = 0;

  function sweep(now: number): void {
    if (now - lastSweep < sweepIntervalMs) return;
    lastSweep = now;
    for (const [key, entry] of attempts) {
      if (now >= entry.resetAt) attempts.delete(key);
    }
    // Map iteration order is insertion order, so deleting from the front
    // drops the oldest tracked IPs. Bounded growth even under flood.
    if (attempts.size > maxTrackedIps) {
      const overflow = attempts.size - maxTrackedIps;
      const iter = attempts.keys();
      for (let i = 0; i < overflow; i++) {
        const next = iter.next();
        if (next.done) break;
        attempts.delete(next.value);
      }
    }
  }

  function check(ip: string): RateLimitResult {
    const now = Date.now();
    sweep(now);
    const entry = attempts.get(ip);

    if (!entry || now >= entry.resetAt) {
      attempts.set(ip, { count: 1, resetAt: now + windowMs });
      return { blocked: false, retryAfterSeconds: 0 };
    }

    entry.count++;

    if (entry.count > maxRequests) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((entry.resetAt - now) / 1000)
      );
      return { blocked: true, retryAfterSeconds };
    }

    return { blocked: false, retryAfterSeconds: 0 };
  }

  function reset(ip?: string): void {
    if (ip) {
      attempts.delete(ip);
    } else {
      attempts.clear();
      lastSweep = 0;
    }
  }

  return { check, reset };
}

/**
 * Extract a client IP for rate-limiting. Prefers `x-vercel-forwarded-for`,
 * which Vercel sets from its own edge and is not user-spoofable. Falls back
 * to `x-forwarded-for` for non-Vercel environments (local dev, other hosts).
 */
export function extractClientIp(request: Request): string {
  const vercelFwd = request.headers.get('x-vercel-forwarded-for');
  if (vercelFwd) return vercelFwd.split(',')[0].trim();
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return 'unknown';
}
