/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { readAdminSession } from '@/lib/adminSession';
import { GET } from './route';

const mockScansSelect = jest.fn();
const mockLeadsSelect = jest.fn();

const mockFrom = jest.fn((table: string) => {
  if (table === 'leads') return { select: mockLeadsSelect };
  return { select: mockScansSelect };
});

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

jest.mock('@/lib/adminSession', () => ({
  readAdminSession: jest.fn(),
}));

const mockedReadAdminSession = readAdminSession as jest.MockedFunction<
  typeof readAdminSession
>;

function createRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/audit/admin/scans');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, { method: 'GET' });
}

const mockScans = [
  {
    id: 'scan-1',
    url: 'https://example.com',
    status: 'completed',
    grade_overall: 'A',
    created_at: '2026-02-22T00:00:00Z',
    score_performance: 95,
    score_accessibility: 90,
    score_seo: 85,
    score_best_practices: 88,
  },
  {
    id: 'scan-2',
    url: 'https://test.com',
    status: 'failed',
    grade_overall: null,
    created_at: '2026-02-21T00:00:00Z',
    score_performance: null,
    score_accessibility: null,
    score_seo: null,
    score_best_practices: null,
  },
];

describe('GET /api/audit/admin/scans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadAdminSession.mockResolvedValue({ sub: 'tools-admin' });
  });

  it('returns 401 without a valid session', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it('returns paginated scans', async () => {
    // Scans query chain
    const orderChain = {
      range: jest.fn().mockResolvedValue({
        data: mockScans,
        count: 2,
        error: null,
      }),
    };
    const selectChain = { order: jest.fn().mockReturnValue(orderChain) };
    mockScansSelect.mockReturnValueOnce(selectChain);

    // Leads lookup chain
    const leadsInChain = {
      in: jest
        .fn()
        .mockResolvedValue({ data: [{ scan_id: 'scan-1' }], error: null }),
    };
    mockLeadsSelect.mockReturnValueOnce(leadsInChain);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scans).toHaveLength(2);
    expect(json.scans[0].has_lead).toBe(true);
    expect(json.scans[1].has_lead).toBe(false);
    expect(json.total).toBe(2);
    expect(json.page).toBe(1);
    expect(json.pageSize).toBe(20);
  });

  it('respects page and pageSize params', async () => {
    const orderChain = {
      range: jest.fn().mockResolvedValue({
        data: [],
        count: 50,
        error: null,
      }),
    };
    const selectChain = { order: jest.fn().mockReturnValue(orderChain) };
    mockScansSelect.mockReturnValueOnce(selectChain);

    const res = await GET(createRequest({ page: '3', pageSize: '10' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.page).toBe(3);
    expect(json.pageSize).toBe(10);
    expect(orderChain.range).toHaveBeenCalledWith(20, 29);
  });

  it('ignores invalid sort columns', async () => {
    const orderChain = {
      range: jest.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    };
    const selectChain = { order: jest.fn().mockReturnValue(orderChain) };
    mockScansSelect.mockReturnValueOnce(selectChain);

    await GET(createRequest({ sort: 'ip_hash' }));
    expect(selectChain.order).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
  });
});
