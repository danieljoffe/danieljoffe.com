const MAX_REQUESTS = 30;
const WINDOW_MS = 60_000;

interface Entry {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, Entry>();

export function checkInsightsRateLimit(ip: string): {
  blocked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
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

export function resetInsightsRateLimit(ip?: string): void {
  if (ip) attempts.delete(ip);
  else attempts.clear();
}
