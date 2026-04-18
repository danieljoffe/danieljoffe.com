/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

const mockCurrentSingle = jest.fn();
const mockCurrentEq = jest.fn(() => ({ single: mockCurrentSingle }));
const mockCurrentSelect = jest.fn(() => ({ eq: mockCurrentEq }));

const mockPreviousMaybeSingle = jest.fn();
const mockPreviousLimit = jest.fn(() => ({
  maybeSingle: mockPreviousMaybeSingle,
}));
const mockPreviousOrder = jest.fn(() => ({ limit: mockPreviousLimit }));
const mockPreviousNeq = jest.fn(() => ({ order: mockPreviousOrder }));
const mockPreviousEq3 = jest.fn(() => ({ neq: mockPreviousNeq }));
const mockPreviousEq2 = jest.fn(() => ({ eq: mockPreviousEq3 }));
const mockPreviousEq1 = jest.fn(() => ({ eq: mockPreviousEq2 }));
const mockPreviousSelect = jest.fn(() => ({ eq: mockPreviousEq1 }));

let selectCallCount = 0;
const mockFrom = jest.fn(() => {
  selectCallCount += 1;
  if (selectCallCount === 1) {
    return { select: mockCurrentSelect };
  }
  return { select: mockPreviousSelect };
});

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

const validId = '550e8400-e29b-41d4-a716-446655440000';
const previousId = '660e8400-e29b-41d4-a716-446655440001';

function createRequest(id: string) {
  return new NextRequest(`http://localhost/api/audit/previous/${id}`);
}

describe('GET /api/audit/previous/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectCallCount = 0;
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createRequest('bad-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'bad-id' }) });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid scan ID' });
  });

  it('returns 404 when the current scan does not exist', async () => {
    mockCurrentSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Scan not found' });
  });

  it('returns previous: null when current scan is not completed', async () => {
    mockCurrentSingle.mockResolvedValueOnce({
      data: {
        id: validId,
        normalized_url: 'https://example.com',
        device_mode: 'mobile',
        status: 'pending',
      },
      error: null,
    });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ previous: null });
    // Previous query should not run for non-completed scans.
    expect(mockPreviousSelect).not.toHaveBeenCalled();
  });

  it('returns previous: null when no prior completed scan exists', async () => {
    mockCurrentSingle.mockResolvedValueOnce({
      data: {
        id: validId,
        normalized_url: 'https://example.com',
        device_mode: 'mobile',
        status: 'completed',
      },
      error: null,
    });
    mockPreviousMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ previous: null });
  });

  it('returns the most recent prior completed scan with same url + device', async () => {
    mockCurrentSingle.mockResolvedValueOnce({
      data: {
        id: validId,
        normalized_url: 'https://example.com',
        device_mode: 'mobile',
        status: 'completed',
      },
      error: null,
    });

    const previousScan = {
      id: previousId,
      url: 'https://example.com',
      normalized_url: 'https://example.com',
      device_mode: 'mobile',
      created_at: '2026-04-01T00:00:00Z',
      completed_at: '2026-04-01T00:01:00Z',
      grade_overall: 'B',
      score_performance: 75,
      score_accessibility: 90,
      score_best_practices: 85,
      score_seo: 92,
    };
    mockPreviousMaybeSingle.mockResolvedValueOnce({
      data: previousScan,
      error: null,
    });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ previous: previousScan });

    // Verify the query filters match spec: same url + same device + completed + not self.
    expect(mockPreviousEq1).toHaveBeenCalledWith(
      'normalized_url',
      'https://example.com'
    );
    expect(mockPreviousEq2).toHaveBeenCalledWith('device_mode', 'mobile');
    expect(mockPreviousEq3).toHaveBeenCalledWith('status', 'completed');
    expect(mockPreviousNeq).toHaveBeenCalledWith('id', validId);
    expect(mockPreviousOrder).toHaveBeenCalledWith('created_at', {
      ascending: false,
    });
    expect(mockPreviousLimit).toHaveBeenCalledWith(1);
  });
});
