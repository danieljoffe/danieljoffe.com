/**
 * @jest-environment node
 */
import { createRateLimiter, extractClientIp } from '../rateLimit';

function req(headers: Record<string, string>): Request {
  return new Request('http://localhost/test', { headers });
}

describe('createRateLimiter', () => {
  it('allows requests under the limit', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    expect(limiter.check('1.1.1.1').blocked).toBe(false);
  });

  it('blocks once the per-IP limit is exceeded', () => {
    const limiter = createRateLimiter({ maxRequests: 3, windowMs: 60_000 });
    const ip = '2.2.2.2';
    for (let i = 0; i < 3; i++) {
      expect(limiter.check(ip).blocked).toBe(false);
    }
    const result = limiter.check(ip);
    expect(result.blocked).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('expires entries after the window passes', () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      const limiter = createRateLimiter({ maxRequests: 2, windowMs: 10_000 });
      const ip = '3.3.3.3';
      limiter.check(ip);
      limiter.check(ip);
      expect(limiter.check(ip).blocked).toBe(true);
      now += 10_001;
      expect(limiter.check(ip).blocked).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });

  it('isolates limits per IP', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    limiter.check('4.4.4.4');
    expect(limiter.check('4.4.4.4').blocked).toBe(true);
    expect(limiter.check('5.5.5.5').blocked).toBe(false);
  });

  it('reset(ip) clears a single IP', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    limiter.check('6.6.6.6');
    expect(limiter.check('6.6.6.6').blocked).toBe(true);
    limiter.reset('6.6.6.6');
    expect(limiter.check('6.6.6.6').blocked).toBe(false);
  });

  it('reset() without args clears all IPs', () => {
    const limiter = createRateLimiter({ maxRequests: 1, windowMs: 60_000 });
    limiter.check('7.7.7.7');
    limiter.check('8.8.8.8');
    expect(limiter.check('7.7.7.7').blocked).toBe(true);
    limiter.reset();
    expect(limiter.check('7.7.7.7').blocked).toBe(false);
    expect(limiter.check('8.8.8.8').blocked).toBe(false);
  });

  it('sweeps expired entries on check', () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      const limiter = createRateLimiter({
        maxRequests: 1,
        windowMs: 5_000,
        sweepIntervalMs: 5_000,
      });
      limiter.check('a');
      expect(limiter.check('a').blocked).toBe(true);

      now += 5_001;
      // Trigger sweep via a check on a different IP
      limiter.check('b');
      // 'a' should have been swept
      expect(limiter.check('a').blocked).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });

  it('evicts oldest IPs when maxTrackedIps is exceeded', () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      const limiter = createRateLimiter({
        maxRequests: 100,
        windowMs: 60_000,
        maxTrackedIps: 3,
        sweepIntervalMs: 1,
      });

      // Fill up the tracker
      limiter.check('ip-1');
      now += 2; // Advance past sweepIntervalMs
      limiter.check('ip-2');
      now += 2;
      limiter.check('ip-3');
      now += 2;
      // This should evict ip-1 (oldest insertion)
      limiter.check('ip-4');

      // ip-1 was evicted, so its count resets — not blocked
      expect(limiter.check('ip-1').blocked).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });
});

describe('extractClientIp', () => {
  it('prefers x-vercel-forwarded-for over x-forwarded-for', () => {
    expect(
      extractClientIp(
        req({
          'x-vercel-forwarded-for': '198.51.100.1',
          'x-forwarded-for': '203.0.113.9, 10.0.0.1',
        })
      )
    ).toBe('198.51.100.1');
  });

  it('falls back to x-forwarded-for first hop', () => {
    expect(
      extractClientIp(req({ 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))
    ).toBe('203.0.113.9');
  });

  it('returns "unknown" when no forwarded headers are set', () => {
    expect(extractClientIp(req({}))).toBe('unknown');
  });
});
