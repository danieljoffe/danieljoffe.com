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
    `http://localhost/api/audit/insights/trends${search}`,
    {
      method: 'GET',
      headers: {
        origin: 'https://danieljoffe.com',
        'x-forwarded-for': '203.0.113.4',
        ...headers,
      },
    }
  );
}

const sampleRows = [
  {
    bucket_start: '2026-03-09T00:00:00Z',
    avg_overall: '85.5',
    scan_count: 12,
  },
  {
    bucket_start: '2026-03-16T00:00:00Z',
    avg_overall: '88.0',
    scan_count: 18,
  },
];

describe('GET /api/audit/insights/trends', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInsightsRateLimit();
    mockRpc.mockResolvedValue({ data: sampleRows, error: null });
  });

  it('rejects external origins', async () => {
    const res = await GET(createRequest('', { origin: 'https://evil.com' }));
    expect(res.status).toBe(403);
  });

  it('uses weekly/6m defaults when no params provided', async () => {
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(mockRpc).toHaveBeenCalledWith('insights_trends', {
      bucket_interval: 'week',
      period_months: 6,
    });
    const json = await res.json();
    expect(json.interval).toBe('weekly');
    expect(json.period).toBe('6m');
    expect(json.series).toEqual([
      {
        bucketStart: '2026-03-09T00:00:00Z',
        avgOverall: 85.5,
        scanCount: 12,
      },
      {
        bucketStart: '2026-03-16T00:00:00Z',
        avgOverall: 88,
        scanCount: 18,
      },
    ]);
  });

  it('maps monthly/12m correctly', async () => {
    await GET(createRequest('?interval=monthly&period=12m'));
    expect(mockRpc).toHaveBeenCalledWith('insights_trends', {
      bucket_interval: 'month',
      period_months: 12,
    });
  });

  it('rejects unknown interval', async () => {
    const res = await GET(createRequest('?interval=daily'));
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('rejects unknown period', async () => {
    const res = await GET(createRequest('?period=24m'));
    expect(res.status).toBe(400);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('returns empty series when fn returns no rows', async () => {
    mockRpc.mockResolvedValueOnce({ data: [], error: null });
    const res = await GET(createRequest());
    expect((await res.json()).series).toEqual([]);
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
