/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { resetInsightsRateLimit } from '../rateLimit';
import { GET } from './route';

const mockLimit = jest.fn();
const mockSecondOrder = jest.fn(() => ({ limit: mockLimit }));
const mockFirstOrder = jest.fn(() => ({ order: mockSecondOrder }));
const orderable = { order: mockFirstOrder };
const mockEq = jest.fn(() => orderable);
const mockSelect = jest.fn(() => ({ ...orderable, eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(search = '', headers: Record<string, string> = {}) {
  return new NextRequest(
    `http://localhost/api/audit/insights/violations${search}`,
    {
      method: 'GET',
      headers: {
        origin: 'https://danieljoffe.com',
        'x-forwarded-for': '203.0.113.2',
        ...headers,
      },
    }
  );
}

const sampleRow = {
  category: 'accessibility',
  title: 'Image elements do not have [alt] attributes',
  occurrence_count: 12,
  severity_critical: 8,
  severity_warning: 4,
  severity_info: 0,
};

describe('GET /api/audit/insights/violations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInsightsRateLimit();
    mockLimit.mockResolvedValue({ data: [sampleRow], error: null });
  });

  it('rejects external origins', async () => {
    const res = await GET(createRequest('', { origin: 'https://evil.com' }));
    expect(res.status).toBe(403);
  });

  it('returns shaped violations for default request', async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      category: 'all',
      limit: 10,
      violations: [
        {
          category: 'accessibility',
          title: 'Image elements do not have [alt] attributes',
          occurrenceCount: 12,
          severity: { critical: 8, warning: 4, info: 0 },
        },
      ],
    });
    expect(mockFrom).toHaveBeenCalledWith('insights_violations_view');
    expect(mockEq).not.toHaveBeenCalled();
  });

  it('filters by category when provided', async () => {
    await GET(createRequest('?category=accessibility'));
    expect(mockEq).toHaveBeenCalledWith('category', 'accessibility');
  });

  it('rejects unknown category', async () => {
    const res = await GET(createRequest('?category=spelling'));
    expect(res.status).toBe(400);
    expect(mockFrom).not.toHaveBeenCalled();
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
    expect((await res.json()).violations).toEqual([]);
  });

  it('returns 500 on supabase error', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    const res = await GET(createRequest());
    expect(res.status).toBe(500);
  });
});
