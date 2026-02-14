/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({
  single: mockSingle,
}));
const mockSelect = jest.fn(() => ({
  eq: mockEq,
}));
const mockFrom = jest.fn(() => ({
  select: mockSelect,
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(id: string) {
  return new NextRequest(`http://localhost/api/audit/status/${id}`);
}

describe('GET /api/audit/status/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createRequest('not-a-uuid');
    const res = await GET(req, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid scan ID');
  });

  it('returns 404 when scan not found', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const id = '550e8400-e29b-41d4-a716-446655440000';
    const req = createRequest(id);
    const res = await GET(req, { params: Promise.resolve({ id }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Scan not found');
  });

  it('returns scan status for valid UUID', async () => {
    const scanData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'completed',
      error_message: null,
      grade_overall: 'B',
    };
    mockSingle.mockResolvedValueOnce({ data: scanData, error: null });

    const req = createRequest(scanData.id);
    const res = await GET(req, {
      params: Promise.resolve({ id: scanData.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe(scanData.id);
    expect(json.status).toBe('completed');
    expect(json.grade).toBe('B');
    expect(json.error_message).toBeNull();
  });

  it('returns pending status with no grade', async () => {
    const scanData = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      status: 'pending',
      error_message: null,
      grade_overall: null,
    };
    mockSingle.mockResolvedValueOnce({ data: scanData, error: null });

    const req = createRequest(scanData.id);
    const res = await GET(req, {
      params: Promise.resolve({ id: scanData.id }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('pending');
    expect(json.grade).toBeNull();
  });
});
