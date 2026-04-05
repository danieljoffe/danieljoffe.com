/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { signLeadId } from '@/lib/email/tokens';
import { GET } from './route';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440000';

const mockUpdate = jest.fn().mockReturnThis();
const mockEq = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: mockUpdate,
      eq: mockEq,
    })),
  })),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function makeUrl(params: Record<string, string>): string {
  const qs = new URLSearchParams(params).toString();
  return `http://localhost/api/email/unsubscribe?${qs}`;
}

describe('GET /api/email/unsubscribe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['UNSUBSCRIBE_SECRET'] = 'test-secret';

    // Default: successful DB update
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });

  it('returns 400 for missing lead_id', async () => {
    const req = new NextRequest(makeUrl({ token: 'abc' }));
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.text();
    expect(body).toContain('Invalid unsubscribe link');
  });

  it('returns 400 for missing token', async () => {
    const req = new NextRequest(makeUrl({ lead_id: LEAD_ID }));
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid UUID', async () => {
    const req = new NextRequest(
      makeUrl({ lead_id: 'not-a-uuid', token: 'abc' })
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 for invalid token', async () => {
    const req = new NextRequest(
      makeUrl({ lead_id: LEAD_ID, token: 'wrong-token' })
    );
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 200 and updates DB for valid token', async () => {
    const token = signLeadId(LEAD_ID);
    const req = new NextRequest(makeUrl({ lead_id: LEAD_ID, token }));
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('You have been unsubscribed');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ unsubscribed: true })
    );
  });

  it('returns 503 when supabase is unavailable', async () => {
    const { createServerSupabaseClient } = jest.requireMock(
      '@/lib/supabase/server'
    );
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce(null);

    const token = signLeadId(LEAD_ID);
    const req = new NextRequest(makeUrl({ lead_id: LEAD_ID, token }));
    const res = await GET(req);
    expect(res.status).toBe(503);
  });

  it('returns 500 when DB update fails', async () => {
    mockEq.mockResolvedValueOnce({ error: { message: 'DB error' } });

    const token = signLeadId(LEAD_ID);
    const req = new NextRequest(makeUrl({ lead_id: LEAD_ID, token }));
    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.text();
    expect(body).toContain('Something went wrong');
  });

  it('returns text/html content type', async () => {
    const token = signLeadId(LEAD_ID);
    const req = new NextRequest(makeUrl({ lead_id: LEAD_ID, token }));
    const res = await GET(req);
    expect(res.headers.get('content-type')).toContain('text/html');
  });
});
