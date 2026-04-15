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

function createRequest() {
  return new NextRequest('http://localhost/api/audit/admin/stats', {
    method: 'GET',
  });
}

describe('GET /api/audit/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadAdminSession.mockResolvedValue({ sub: 'tools-admin' });
  });

  it('returns 401 without a valid session', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
  });

  it('returns aggregate stats', async () => {
    mockSelect.mockReturnValueOnce(Promise.resolve({ count: 42, error: null }));
    const todayChain = { gte: jest.fn() };
    mockSelect.mockReturnValueOnce(todayChain);
    todayChain.gte.mockResolvedValueOnce({ count: 5, error: null });
    mockSelect.mockReturnValueOnce(Promise.resolve({ count: 10, error: null }));
    const completedChain = { eq: jest.fn() };
    mockSelect.mockReturnValueOnce(completedChain);
    completedChain.eq.mockResolvedValueOnce({ count: 40, error: null });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.totalScans).toBe(42);
    expect(json.scansToday).toBe(5);
    expect(json.totalLeads).toBe(10);
    expect(json.conversionRate).toBe(25);
  });

  it('handles zero completed scans without division error', async () => {
    mockSelect.mockReturnValueOnce(Promise.resolve({ count: 0, error: null }));
    const todayChain = { gte: jest.fn() };
    mockSelect.mockReturnValueOnce(todayChain);
    todayChain.gte.mockResolvedValueOnce({ count: 0, error: null });
    mockSelect.mockReturnValueOnce(Promise.resolve({ count: 0, error: null }));
    const completedChain = { eq: jest.fn() };
    mockSelect.mockReturnValueOnce(completedChain);
    completedChain.eq.mockResolvedValueOnce({ count: 0, error: null });

    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.conversionRate).toBe(0);
  });
});
