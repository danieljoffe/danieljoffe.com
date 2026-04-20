/**
 * @jest-environment node
 */
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

describe('GET /api/audit/admin/leads/sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedReadAdminSession.mockResolvedValue({ sub: 'tools-admin' });
  });

  it('returns 401 without a valid session', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('aggregates lead rows by source, descending', async () => {
    mockSelect.mockResolvedValueOnce({
      data: [
        { source: 'organic' },
        { source: 'organic' },
        { source: 'full_report' },
        { source: 'organic' },
      ],
      error: null,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.total).toBe(4);
    expect(json.sources).toEqual([
      { source: 'organic', count: 3 },
      { source: 'full_report', count: 1 },
    ]);
  });

  it("buckets null sources as 'unknown'", async () => {
    mockSelect.mockResolvedValueOnce({
      data: [{ source: null }, { source: null }, { source: 'organic' }],
      error: null,
    });

    const res = await GET();
    const json = await res.json();

    expect(json.total).toBe(3);
    expect(json.sources).toEqual([
      { source: 'unknown', count: 2 },
      { source: 'organic', count: 1 },
    ]);
  });

  it('returns zero total with no rows', async () => {
    mockSelect.mockResolvedValueOnce({ data: [], error: null });

    const res = await GET();
    const json = await res.json();

    expect(json.total).toBe(0);
    expect(json.sources).toEqual([]);
  });

  it('returns 500 when the query errors', async () => {
    mockSelect.mockResolvedValueOnce({
      data: null,
      error: { message: 'boom' },
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
