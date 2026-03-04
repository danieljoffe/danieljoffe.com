/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

// Build chainable mock for scan query (select → eq → eq → single)
const mockScanSingle = jest.fn();
const mockScanEq2 = jest.fn(() => ({ single: mockScanSingle }));
const mockScanEq1 = jest.fn(() => ({ eq: mockScanEq2 }));
const mockScanSelect = jest.fn(() => ({ eq: mockScanEq1 }));

// Build chainable mock for issues query (select → eq → order)
const mockIssuesOrder = jest.fn();
const mockIssuesEq = jest.fn(() => ({ order: mockIssuesOrder }));
const mockIssuesSelect = jest.fn(() => ({ eq: mockIssuesEq }));

const mockFrom = jest.fn((table: string) => {
  if (table === 'scans') {
    return { select: mockScanSelect };
  }
  if (table === 'scan_issues') {
    return { select: mockIssuesSelect };
  }
  return {};
});

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(id: string) {
  return new NextRequest(`http://localhost/api/audit/report/${id}`);
}

const validId = '550e8400-e29b-41d4-a716-446655440000';

const mockScan = {
  id: validId,
  url: 'https://example.com',
  normalized_url: 'https://example.com',
  status: 'completed',
  created_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T00:01:00Z',
  error_message: null,
  score_performance: 85,
  score_accessibility: 90,
  score_best_practices: 80,
  score_seo: 95,
  grade_overall: 'B',
  fcp_ms: 1200,
  lcp_ms: 2500,
  tbt_ms: 200,
  cls: 0.05,
  si_ms: 1800,
  page_title: 'Example',
  page_description: 'An example page',
  page_screenshot_url: null,
  source: 'organic',
};

const mockIssues = [
  {
    id: 'issue-1',
    scan_id: validId,
    category: 'performance',
    severity: 'critical',
    title: 'Large LCP',
    description: 'Largest Contentful Paint is too slow',
    impact: 'High',
    fix_difficulty: 'moderate',
    technical_detail: null,
    sort_order: 1,
  },
  {
    id: 'issue-2',
    scan_id: validId,
    category: 'accessibility',
    severity: 'warning',
    title: 'Missing alt text',
    description: 'Images missing alt attributes',
    impact: 'Medium',
    fix_difficulty: 'easy',
    technical_detail: null,
    sort_order: 2,
  },
  {
    id: 'issue-3',
    scan_id: validId,
    category: 'seo',
    severity: 'info',
    title: 'No robots.txt',
    description: 'Missing robots.txt file',
    impact: 'Low',
    fix_difficulty: 'easy',
    technical_detail: null,
    sort_order: 3,
  },
];

describe('GET /api/audit/report/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid UUID', async () => {
    const req = createRequest('bad-id');
    const res = await GET(req, { params: Promise.resolve({ id: 'bad-id' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid scan ID');
  });

  it('returns 404 when scan not found or not completed', async () => {
    mockScanSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST116' },
    });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('Report not found');
  });

  it('returns scan data, issues, and summary for completed scan', async () => {
    mockScanSingle.mockResolvedValueOnce({ data: mockScan, error: null });
    mockIssuesOrder.mockResolvedValueOnce({ data: mockIssues, error: null });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.scan.id).toBe(validId);
    expect(json.scan.score_performance).toBe(85);
    expect(json.issues).toHaveLength(3);
    expect(json.summary).toEqual({
      total: 3,
      critical: 1,
      warning: 1,
      info: 1,
    });
  });

  it('does not include lighthouse_raw or axe_raw in response', async () => {
    mockScanSingle.mockResolvedValueOnce({ data: mockScan, error: null });
    mockIssuesOrder.mockResolvedValueOnce({ data: mockIssues, error: null });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    const json = await res.json();

    // The select query explicitly omits lighthouse_raw and axe_raw
    expect(json.scan).not.toHaveProperty('lighthouse_raw');
    expect(json.scan).not.toHaveProperty('axe_raw');
  });

  it('returns empty issues array when no issues exist', async () => {
    mockScanSingle.mockResolvedValueOnce({ data: mockScan, error: null });
    mockIssuesOrder.mockResolvedValueOnce({ data: [], error: null });

    const req = createRequest(validId);
    const res = await GET(req, { params: Promise.resolve({ id: validId }) });
    const json = await res.json();

    expect(json.issues).toHaveLength(0);
    expect(json.summary).toEqual({
      total: 0,
      critical: 0,
      warning: 0,
      info: 0,
    });
  });
});
