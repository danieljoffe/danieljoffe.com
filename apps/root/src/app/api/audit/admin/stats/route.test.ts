/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(password = 'test-admin-pass') {
  return new NextRequest('http://localhost/api/audit/admin/stats', {
    method: 'GET',
    headers: { 'x-admin-password': password },
  });
}

describe('GET /api/audit/admin/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['AUDIT_ADMIN_PASSWORD'] = 'test-admin-pass';
  });

  afterEach(() => {
    delete process.env['AUDIT_ADMIN_PASSWORD'];
  });

  it('returns 401 without password', async () => {
    const req = new NextRequest('http://localhost/api/audit/admin/stats');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 with wrong password', async () => {
    const res = await GET(createRequest('wrong'));
    expect(res.status).toBe(401);
  });

  it('returns aggregate stats', async () => {
    // Total scans
    mockSelect.mockReturnValueOnce(Promise.resolve({ count: 42, error: null }));
    // Scans today
    const todayChain = { gte: jest.fn() };
    mockSelect.mockReturnValueOnce(todayChain);
    todayChain.gte.mockResolvedValueOnce({ count: 5, error: null });
    // Total leads
    mockSelect.mockReturnValueOnce(Promise.resolve({ count: 10, error: null }));
    // Completed scans
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
