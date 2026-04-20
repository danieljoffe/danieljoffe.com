const MAX_REQUESTS = 30;
const WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 10_000;
const SWEEP_INTERVAL_MS = 60_000;

interface Entry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Entry>();
let lastSweep = 0;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of attempts) {
    if (now >= entry.resetAt) attempts.delete(key);
  }
  if (attempts.size > MAX_TRACKED_IPS) {
    // Map iteration order is insertion order, so deleting from the front
    // drops the oldest tracked IPs. Bounded growth even under flood.
    const overflow = attempts.size - MAX_TRACKED_IPS;
    const iter = attempts.keys();
    for (let i = 0; i < overflow; i++) {
      const next = iter.next();
      if (next.done) break;
      attempts.delete(next.value);
    }
  }
}

export function checkInsightsRateLimit(ip: string): {
  blocked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  sweep(now);
  const entry = attempts.get(ip);

  if (!entry || now >= entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { blocked: false, retryAfterSeconds: 0 };
  }

  entry.count++;

  if (entry.count > MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { blocked: true, retryAfterSeconds };
  }

  return { blocked: false, retryAfterSeconds: 0 };
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

export function resetInsightsRateLimit(ip?: string): void {
  if (ip) {
    attempts.delete(ip);
  } else {
    attempts.clear();
    lastSweep = 0;
  }
}
