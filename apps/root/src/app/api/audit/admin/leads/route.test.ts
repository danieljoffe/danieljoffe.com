/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { readAdminSession } from '@/lib/adminSession';
import { GET } from './route';

const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ select: mockSelect }));

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
  const url = new URL('http://localhost/api/audit/admin/leads');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url, { method: 'GET' });
}

const mockLeads = [
  {
    id: 'lead-1',
    email: 'test@example.com',
    name: 'Test User',
    company: 'Acme',
    url_scanned: 'https://example.com',
    source: 'full_report',
    created_at: '2026-02-22T00:00:00Z',
    email_sequence_step: 1,
  },
];

describe('GET /api/audit/admin/leads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadAdminSession.mockResolvedValue({ sub: 'tools-admin' });
  });

  it('returns 401 without a valid session', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it('returns paginated leads', async () => {
    const orderChain = {
      range: jest.fn().mockResolvedValue({
        data: mockLeads,
        count: 1,
        error: null,
      }),
    };
    const selectChain = { order: jest.fn().mockReturnValue(orderChain) };
    mockSelect.mockReturnValueOnce(selectChain);

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.leads).toHaveLength(1);
    expect(json.leads[0].email).toBe('test@example.com');
    expect(json.total).toBe(1);
    expect(json.page).toBe(1);
  });

  it('respects sort and order params', async () => {
    const orderChain = {
      range: jest.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    };
    const selectChain = { order: jest.fn().mockReturnValue(orderChain) };
    mockSelect.mockReturnValueOnce(selectChain);

    await GET(createRequest({ sort: 'email', order: 'asc' }));
    expect(selectChain.order).toHaveBeenCalledWith('email', {
      ascending: true,
    });
  });

  it('caps pageSize at 100', async () => {
    const orderChain = {
      range: jest.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    };
    const selectChain = { order: jest.fn().mockReturnValue(orderChain) };
    mockSelect.mockReturnValueOnce(selectChain);

    const res = await GET(createRequest({ pageSize: '500' }));
    const json = await res.json();
    expect(json.pageSize).toBe(100);
  });
});
