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

describe('insights rate limiter (30 req / 60s)', () => {
  beforeEach(() => {
    resetInsightsRateLimit();
  });

  it('allows 30 requests then blocks', () => {
    const ip = '1.1.1.1';
    for (let i = 0; i < 30; i++) {
      expect(checkInsightsRateLimit(ip).blocked).toBe(false);
    }
    const result = checkInsightsRateLimit(ip);
    expect(result.blocked).toBe(true);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('resets after the 60s window expires', () => {
    const ip = '2.2.2.2';
    jest.useFakeTimers();
    try {
      // Exhaust the limit
      for (let i = 0; i < 30; i++) checkInsightsRateLimit(ip);
      expect(checkInsightsRateLimit(ip).blocked).toBe(true);

      // Advance past the 60s window
      jest.advanceTimersByTime(61_000);
      expect(checkInsightsRateLimit(ip).blocked).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('re-exports extractClientIp', () => {
    expect(
      extractClientIp(req({ 'x-vercel-forwarded-for': '198.51.100.1' }))
    ).toBe('198.51.100.1');
  });
});
