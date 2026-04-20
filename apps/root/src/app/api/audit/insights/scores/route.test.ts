/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { resetInsightsRateLimit } from '../rateLimit';
import { GET } from './route';

const mockRpc = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ rpc: mockRpc }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(search = '', headers: Record<string, string> = {}) {
  return new NextRequest(
    `http://localhost/api/audit/insights/scores${search}`,
    {
      method: 'GET',
      headers: {
        origin: 'https://danieljoffe.com',
        'x-forwarded-for': '203.0.113.3',
        ...headers,
      },
    }
  );
}

const sampleRow = {
  avg_performance: '88.4',
  avg_accessibility: '92.1',
  avg_best_practices: '95.0',
  avg_seo: '90.3',
  avg_overall: '91.4',
  grade_a: 30,
  grade_b: 40,
  grade_c: 18,
  grade_d: 7,
  grade_f: 3,
  total: 98,
};

describe('GET /api/audit/insights/scores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInsightsRateLimit();
    mockRpc.mockResolvedValue({ data: [sampleRow], error: null });
  });

  it('rejects external origins', async () => {
    const res = await GET(createRequest('', { origin: 'https://evil.com' }));
    expect(res.status).toBe(403);
  });

  it('returns shaped score stats with no period filter', async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('insights_score_stats', {
      period_days: null,
    });
    expect(await res.json()).toEqual({
      period: null,
      averages: {
        performance: 88.4,
        accessibility: 92.1,
        bestPractices: 95,
        seo: 90.3,
        overall: 91.4,
      },
      gradeDistribution: { A: 30, B: 40, C: 18, D: 7, F: 3 },
      total: 98,
    });
  });

  it('passes period_days=30 when ?period=30', async () => {
    await GET(createRequest('?period=30'));
    expect(mockRpc).toHaveBeenCalledWith('insights_score_stats', {
      period_days: 30,
    });
  });

  it('passes period_days=90 when ?period=90', async () => {
    await GET(createRequest('?period=90'));
    expect(mockRpc).toHaveBeenCalledWith('insights_score_stats', {
      period_days: 90,
    });
  });

  it('rejects invalid period values', async () => {
    const res = await GET(createRequest('?period=7'));
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('handles empty database (null averages, zero counts)', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          avg_performance: null,
          avg_accessibility: null,
          avg_best_practices: null,
          avg_seo: null,
          avg_overall: null,
          grade_a: 0,
          grade_b: 0,
          grade_c: 0,
          grade_d: 0,
          grade_f: 0,
          total: 0,
        },
      ],
      error: null,
    });
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.averages.overall).toBeNull();
    expect(json.total).toBe(0);
  });

  it('returns 500 on rpc error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'fn missing' },
    });
    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });
});
