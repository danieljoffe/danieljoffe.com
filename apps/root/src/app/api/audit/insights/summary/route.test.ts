/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { resetInsightsRateLimit } from '../rateLimit';
import { GET } from './route';

const mockMaybeSingle = jest.fn();
const mockSelect = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/audit/insights/summary', {
    method: 'GET',
    headers: {
      origin: 'https://danieljoffe.com',
      'x-forwarded-for': '203.0.113.1',
      ...headers,
    },
  });
}

describe('GET /api/audit/insights/summary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInsightsRateLimit();
  });

  it('returns 403 when origin is not allowed', async () => {
    const res = await GET(
      createRequest({ origin: 'https://evil.example.com' })
    );
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Forbidden' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('returns aggregated summary from the view', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        total_scans: 128,
        unique_domains: 47,
        avg_overall_score: '82.3',
        top_violation: 'Image elements do not have [alt] attributes',
      },
      error: null,
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalScans: 128,
      uniqueDomains: 47,
      avgOverallScore: 82.3,
      topViolation: 'Image elements do not have [alt] attributes',
    });
    expect(mockFrom).toHaveBeenCalledWith('insights_summary_view');
    expect(res.headers.get('Cache-Control')).toContain('s-maxage=3600');
  });

  it('handles an empty database (zero completed scans)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        total_scans: 0,
        unique_domains: 0,
        avg_overall_score: null,
        top_violation: null,
      },
      error: null,
    });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalScans: 0,
      uniqueDomains: 0,
      avgOverallScore: null,
      topViolation: null,
    });
  });

  it('returns zeroed summary when the view yields no rows', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      totalScans: 0,
      uniqueDomains: 0,
      avgOverallScore: null,
      topViolation: null,
    });
  });

  it('returns 500 when the view query errors', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'view missing' },
    });
    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });

  it('returns 429 once rate limit is exhausted', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        total_scans: 1,
        unique_domains: 1,
        avg_overall_score: '90',
        top_violation: null,
      },
      error: null,
    });

    for (let i = 0; i < 30; i++) {
      const res = await GET(createRequest());
      expect(res.status).toBe(200);
    }
    const blocked = await GET(createRequest());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeDefined();
  });
});
