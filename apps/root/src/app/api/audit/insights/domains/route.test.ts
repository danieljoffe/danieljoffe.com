/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { resetInsightsRateLimit } from '../rateLimit';
import { GET } from './route';

const mockLimit = jest.fn();
const mockSecondOrder = jest.fn(() => ({ limit: mockLimit }));
const mockFirstOrder = jest.fn(() => ({ order: mockSecondOrder }));
const mockSelect = jest.fn(() => ({ order: mockFirstOrder }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(search = '', headers: Record<string, string> = {}) {
  return new NextRequest(
    `http://localhost/api/audit/insights/domains${search}`,
    {
      method: 'GET',
      headers: {
        origin: 'https://danieljoffe.com',
        'x-forwarded-for': '203.0.113.5',
        ...headers,
      },
    }
  );
}

const sampleRow = {
  domain: 'example.com',
  scan_count: 47,
  latest_grade: 'B',
  latest_scan_at: '2026-04-15T12:00:00Z',
};

describe('GET /api/audit/insights/domains', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInsightsRateLimit();
    mockLimit.mockResolvedValue({ data: [sampleRow], error: null });
  });

  it('rejects external origins', async () => {
    const res = await GET(createRequest('', { origin: 'https://evil.com' }));
    expect(res.status).toBe(403);
  });

  it('returns shaped domain rows with default limit', async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(mockFrom).toHaveBeenCalledWith('insights_domains_view');
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(await res.json()).toEqual({
      limit: 10,
      domains: [
        {
          domain: 'example.com',
          scanCount: 47,
          latestGrade: 'B',
          latestScanAt: '2026-04-15T12:00:00Z',
        },
      ],
    });
  });

  it('clamps limit to MAX_LIMIT', async () => {
    await GET(createRequest('?limit=999'));
    expect(mockLimit).toHaveBeenCalledWith(50);
  });

  it('falls back to default limit on garbage input', async () => {
    await GET(createRequest('?limit=abc'));
    expect(mockLimit).toHaveBeenCalledWith(10);
  });

  it('returns empty array when view yields no rows', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    const res = await GET(createRequest());
    expect((await res.json()).domains).toEqual([]);
  });

  it('returns 500 on supabase error', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'view missing' },
    });
    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });
});
