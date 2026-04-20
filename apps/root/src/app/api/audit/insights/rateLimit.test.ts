/**
 * @jest-environment node
 */
import {
  checkInsightsRateLimit,
  extractClientIp,
  resetInsightsRateLimit,
} from './rateLimit';

function req(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/audit/insights/summary', {
    headers,
  });
}

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

describe('checkInsightsRateLimit', () => {
  beforeEach(() => {
    resetInsightsRateLimit();
  });

  it('allows requests under the limit', () => {
    const result = checkInsightsRateLimit('1.1.1.1');
    expect(result.blocked).toBe(false);
  });

  it('blocks once the per-IP limit is exceeded', () => {
    const ip = '2.2.2.2';
    for (let i = 0; i < 30; i++) {
      expect(checkInsightsRateLimit(ip).blocked).toBe(false);
    }
    const blocked = checkInsightsRateLimit(ip);
    expect(blocked.blocked).toBe(true);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('expires entries after the window passes', () => {
    const realNow = Date.now;
    let now = 1_000_000;
    Date.now = () => now;
    try {
      const ip = '3.3.3.3';
      for (let i = 0; i < 30; i++) checkInsightsRateLimit(ip);
      expect(checkInsightsRateLimit(ip).blocked).toBe(true);
      now += 60_001;
      expect(checkInsightsRateLimit(ip).blocked).toBe(false);
    } finally {
      Date.now = realNow;
    }
  });

  it('isolates limits per IP', () => {
    for (let i = 0; i < 30; i++) checkInsightsRateLimit('4.4.4.4');
    expect(checkInsightsRateLimit('4.4.4.4').blocked).toBe(true);
    expect(checkInsightsRateLimit('5.5.5.5').blocked).toBe(false);
  });
});
