/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

const mockScansEq = jest.fn();
const mockScansIn = jest.fn(() => ({ eq: mockScansEq }));
const mockScansSelect = jest.fn(() => ({ in: mockScansIn }));

const mockIssuesIn = jest.fn();
const mockIssuesSelect = jest.fn(() => ({ in: mockIssuesIn }));

const mockFrom = jest.fn((table: string) => {
  if (table === 'scans') return { select: mockScansSelect };
  if (table === 'scan_issues') return { select: mockIssuesSelect };
  return {};
});

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

const idA = '550e8400-e29b-41d4-a716-446655440000';
const idB = '660e8400-e29b-41d4-a716-446655440001';

function createRequest(query: string) {
  return new NextRequest(`http://localhost/api/audit/compare?${query}`);
}

function buildScan(overrides: Record<string, unknown>) {
  return {
    id: idA,
    url: 'https://example.com',
    normalized_url: 'https://example.com',
    status: 'completed',
    created_at: '2026-04-01T00:00:00Z',
    completed_at: '2026-04-01T00:01:00Z',
    device_mode: 'mobile',
    grade_overall: 'B',
    score_performance: 75,
    score_accessibility: 90,
    score_best_practices: 85,
    score_seo: 92,
    fcp_ms: 1500,
    lcp_ms: 2400,
    tbt_ms: 180,
    cls: 0.05,
    si_ms: 3200,
    page_title: 'Example',
    page_screenshot_url: null,
    ...overrides,
  };
}

describe('GET /api/audit/compare', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when auditA or auditB is missing', async () => {
    const res = await GET(createRequest(`auditA=${idA}`));
    expect(res.status).toBe(400);
  });

  it('returns 400 when UUIDs are invalid', async () => {
    const res = await GET(createRequest(`auditA=bad&auditB=${idB}`));
    expect(res.status).toBe(400);
  });

  it('returns 400 when auditA === auditB', async () => {
    const res = await GET(createRequest(`auditA=${idA}&auditB=${idA}`));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'auditA and auditB must differ',
    });
  });

  it('returns 404 when only one scan exists', async () => {
    mockScansEq.mockResolvedValueOnce({
      data: [buildScan({ id: idA })],
      error: null,
    });
    const res = await GET(createRequest(`auditA=${idA}&auditB=${idB}`));
    expect(res.status).toBe(404);
  });

  it('returns 400 when normalized_urls differ', async () => {
    mockScansEq.mockResolvedValueOnce({
      data: [
        buildScan({ id: idA, normalized_url: 'https://example.com' }),
        buildScan({ id: idB, normalized_url: 'https://other.com' }),
      ],
      error: null,
    });
    const res = await GET(createRequest(`auditA=${idA}&auditB=${idB}`));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'Scans must share the same normalized URL',
    });
  });

  it('returns both scans + both issue lists, keyed correctly', async () => {
    mockScansEq.mockResolvedValueOnce({
      data: [
        buildScan({ id: idA, score_performance: 60 }),
        buildScan({ id: idB, score_performance: 85 }),
      ],
      error: null,
    });
    mockIssuesIn.mockResolvedValueOnce({
      data: [
        { id: 'x', scan_id: idA, title: 'A-issue' },
        { id: 'y', scan_id: idB, title: 'B-issue' },
      ],
      error: null,
    });

    const res = await GET(createRequest(`auditA=${idA}&auditB=${idB}`));
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.scanA.id).toBe(idA);
    expect(json.scanB.id).toBe(idB);
    expect(json.scanA.score_performance).toBe(60);
    expect(json.scanB.score_performance).toBe(85);
    expect(json.issuesA).toEqual([{ id: 'x', scan_id: idA, title: 'A-issue' }]);
    expect(json.issuesB).toEqual([{ id: 'y', scan_id: idB, title: 'B-issue' }]);
  });

  it('surfaces 500 via captureApiError on supabase throw', async () => {
    const err = new Error('boom');
    mockScansEq.mockRejectedValueOnce(err);
    const res = await GET(createRequest(`auditA=${idA}&auditB=${idB}`));
    expect(res.status).toBe(500);
  });
});
