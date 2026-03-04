/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockSend = jest.fn();
jest.mock('@/lib/email/resend', () => ({
  createResendClient: jest.fn(() => ({
    emails: { send: (...args: unknown[]) => mockSend(...args) },
  })),
  EMAIL_FROM: 'Daniel Joffe <noreply@danieljoffe.com>',
}));

jest.mock('@/lib/email/tokens', () => ({
  buildUnsubscribeUrl: jest.fn(
    (id: string) =>
      `https://danieljoffe.com/api/email/unsubscribe?lead_id=${id}&token=test`
  ),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

jest.mock('@danieljoffe.com/shared-audit', () => ({
  GRADE_MAP: {
    A: { grade: 'A', label: 'Excellent', color: '#63CAA5' },
    C: { grade: 'C', label: 'Needs Work', color: '#FFB46B' },
  },
}));

jest.mock('@/utils/constants', () => ({
  CALENDLY_URL: 'https://calendly.com/test',
}));

// Email templates return plain objects in test (React elements)
jest.mock('@/components/emails/QuickWin', () => ({
  __esModule: true,
  default: jest.fn(() => '<QuickWinEmail />'),
}));
jest.mock('@/components/emails/FollowUp', () => ({
  __esModule: true,
  default: jest.fn(() => '<FollowUpEmail />'),
}));

// Supabase mock
const mockLeadsSelect = jest.fn();
const mockScanSelect = jest.fn();
const mockIssuesSelect = jest.fn();
const mockLeadsUpdate = jest.fn();
const mockEmailLogInsert = jest.fn();

function makeChain(terminalFn: jest.Mock) {
  const chain: Record<string, jest.Mock> = {};
  const proxy = new Proxy(chain, {
    get: (_target, prop) => {
      // Make the proxy thenable so `await chain.eq().order()` works
      // (Supabase query builders are PromiseLike)
      if (prop === 'then') {
        return (
          onFulfilled?: (v: unknown) => unknown,
          onRejected?: (r: unknown) => unknown
        ) => Promise.resolve(terminalFn()).then(onFulfilled, onRejected);
      }
      if (prop === 'catch') return undefined;
      if (!chain[prop as string]) {
        chain[prop as string] = jest.fn(() => proxy);
      }
      return chain[prop as string];
    },
  });
  return proxy;
}

const mockFrom = jest.fn((table: string) => {
  if (table === 'leads') {
    // Return object with both select and update so the route can call either
    return {
      select: jest.fn(() => makeChain(mockLeadsSelect)),
      update: jest.fn(() => ({ eq: mockLeadsUpdate })),
    };
  }
  if (table === 'scans') return makeChain(mockScanSelect);
  if (table === 'scan_issues') return makeChain(mockIssuesSelect);
  if (table === 'email_log') return { insert: mockEmailLogInsert };
  return makeChain(jest.fn());
});

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: jest.fn(() => ({ from: mockFrom })),
}));

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader) headers['authorization'] = authHeader;
  return new NextRequest('http://localhost/api/email/sequence', { headers });
}

describe('GET /api/email/sequence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['CRON_SECRET'] = 'cron-secret-123';
    process.env['UNSUBSCRIBE_SECRET'] = 'test-secret';
    process.env['NEXT_PUBLIC_SITE_URL'] = 'https://danieljoffe.com';
    process.env['RESEND_API_KEY'] = 'test-resend-key';

    // Defaults: no leads to process
    mockLeadsSelect.mockResolvedValue({ data: [], error: null });
    mockLeadsUpdate.mockResolvedValue({ error: null });
    mockEmailLogInsert.mockResolvedValue({ error: null });
    mockSend.mockResolvedValue({ data: { id: 'resend-123' }, error: null });
  });

  it('returns 401 when authorization header is missing', async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 401 when authorization header is wrong', async () => {
    const res = await GET(makeRequest('Bearer wrong'));
    expect(res.status).toBe(401);
  });

  it('returns 200 with zero counts when no leads are due', async () => {
    const res = await GET(makeRequest('Bearer cron-secret-123'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.sent).toBe(0);
    expect(json.skipped).toBe(0);
    expect(json.errors).toBe(0);
  });

  it('sends quick-win email for step 1 leads', async () => {
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

    // First leads query (step 1)
    mockLeadsSelect.mockResolvedValueOnce({
      data: [
        {
          id: 'lead-1',
          email: 'user@example.com',
          name: 'Jane',
          scan_id: 'scan-1',
          url_scanned: 'https://example.com',
        },
      ],
      error: null,
    });
    // Second leads query (step 2) — empty
    mockLeadsSelect.mockResolvedValueOnce({ data: [], error: null });

    mockScanSelect.mockResolvedValueOnce({
      data: {
        url: 'https://example.com',
        grade_overall: 'C',
        score_performance: 55,
        score_accessibility: 70,
        score_seo: 80,
        score_best_practices: 65,
      },
      error: null,
    });

    mockIssuesSelect.mockResolvedValueOnce({
      data: [
        {
          title: 'Images not compressed',
          description: 'Compress your images',
          category: 'performance',
          severity: 'warning',
          fix_difficulty: 'easy',
          impact: 'Reduces page weight by 30%',
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    const json = await res.json();

    expect(json.sent).toBe(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: expect.stringContaining('Quick fix'),
      })
    );
  });

  it('skips leads with no scan_id and advances step', async () => {
    mockLeadsSelect.mockResolvedValueOnce({
      data: [
        {
          id: 'lead-no-scan',
          email: 'user@example.com',
          name: null,
          scan_id: null,
          url_scanned: null,
        },
      ],
      error: null,
    });
    mockLeadsSelect.mockResolvedValueOnce({ data: [], error: null });

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    const json = await res.json();

    expect(json.skipped).toBe(1);
    expect(json.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips email when no easy/moderate issues exist', async () => {
    mockLeadsSelect.mockResolvedValueOnce({
      data: [
        {
          id: 'lead-1',
          email: 'user@example.com',
          name: null,
          scan_id: 'scan-1',
          url_scanned: 'https://example.com',
        },
      ],
      error: null,
    });
    mockLeadsSelect.mockResolvedValueOnce({ data: [], error: null });

    mockScanSelect.mockResolvedValueOnce({
      data: { url: 'https://example.com', grade_overall: 'C' },
      error: null,
    });
    mockIssuesSelect.mockResolvedValueOnce({
      data: [
        {
          title: 'Complex issue',
          description: 'Hard to fix',
          category: 'performance',
          severity: 'critical',
          fix_difficulty: 'complex',
          impact: null,
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    const json = await res.json();

    expect(json.skipped).toBe(1);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('continues processing when one lead fails', async () => {
    mockLeadsSelect.mockResolvedValueOnce({
      data: [
        {
          id: 'lead-fail',
          email: 'fail@example.com',
          name: null,
          scan_id: 'scan-1',
          url_scanned: 'https://example.com',
        },
        {
          id: 'lead-ok',
          email: 'ok@example.com',
          name: null,
          scan_id: 'scan-2',
          url_scanned: 'https://other.com',
        },
      ],
      error: null,
    });
    mockLeadsSelect.mockResolvedValueOnce({ data: [], error: null });

    // First scan lookup fails
    mockScanSelect.mockResolvedValueOnce({ data: null, error: null });
    // Second scan lookup succeeds
    mockScanSelect.mockResolvedValueOnce({
      data: { url: 'https://other.com', grade_overall: 'A' },
      error: null,
    });
    mockIssuesSelect.mockResolvedValueOnce({
      data: [
        {
          title: 'Easy fix',
          description: 'Do this',
          category: 'seo',
          severity: 'warning',
          fix_difficulty: 'easy',
          impact: 'Improves SEO',
        },
      ],
      error: null,
    });

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    const json = await res.json();

    // First lead skipped (no scan data), second sent
    expect(json.skipped).toBe(1);
    expect(json.sent).toBe(1);
  });

  it('returns 503 when supabase is unavailable', async () => {
    const { createServerSupabaseClient } = jest.requireMock(
      '@/lib/supabase/server'
    );
    (createServerSupabaseClient as jest.Mock).mockReturnValueOnce(null);

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    expect(res.status).toBe(503);
  });

  it('returns 503 when resend is unavailable', async () => {
    const { createResendClient } = jest.requireMock('@/lib/email/resend');
    (createResendClient as jest.Mock).mockReturnValueOnce(null);

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    expect(res.status).toBe(503);
  });

  it('merges results from step 1 and step 2', async () => {
    // Step 1: one lead
    mockLeadsSelect.mockResolvedValueOnce({
      data: [
        {
          id: 'lead-s1',
          email: 'a@example.com',
          name: 'A',
          scan_id: 'scan-1',
          url_scanned: 'https://a.com',
        },
      ],
      error: null,
    });
    // Step 2: one lead
    mockLeadsSelect.mockResolvedValueOnce({
      data: [
        {
          id: 'lead-s2',
          email: 'b@example.com',
          name: 'B',
          scan_id: 'scan-2',
          url_scanned: 'https://b.com',
        },
      ],
      error: null,
    });

    // Scan for step 1 lead
    mockScanSelect.mockResolvedValueOnce({
      data: {
        url: 'https://a.com',
        grade_overall: 'C',
        score_performance: 50,
        score_accessibility: 60,
        score_seo: 70,
        score_best_practices: 55,
      },
      error: null,
    });
    mockIssuesSelect.mockResolvedValueOnce({
      data: [
        {
          title: 'Fix images',
          description: 'Compress them',
          category: 'performance',
          severity: 'warning',
          fix_difficulty: 'easy',
          impact: null,
        },
      ],
      error: null,
    });

    // Scan for step 2 lead
    mockScanSelect.mockResolvedValueOnce({
      data: {
        url: 'https://b.com',
        grade_overall: 'A',
        score_performance: 95,
        score_accessibility: 90,
        score_seo: 95,
        score_best_practices: 92,
      },
      error: null,
    });

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    const json = await res.json();

    expect(json.sent).toBe(2);
    expect(json.skipped).toBe(0);
    expect(json.errors).toBe(0);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('counts send failures as errors and reports to Sentry', async () => {
    const { captureApiError } = jest.requireMock('@/lib/errorTracking');

    mockLeadsSelect.mockResolvedValueOnce({
      data: [
        {
          id: 'lead-err',
          email: 'err@example.com',
          name: null,
          scan_id: 'scan-1',
          url_scanned: 'https://example.com',
        },
      ],
      error: null,
    });
    mockLeadsSelect.mockResolvedValueOnce({ data: [], error: null });

    mockScanSelect.mockResolvedValueOnce({
      data: { url: 'https://example.com', grade_overall: 'C' },
      error: null,
    });
    mockIssuesSelect.mockResolvedValueOnce({
      data: [
        {
          title: 'Easy fix',
          description: 'Do this',
          category: 'seo',
          severity: 'warning',
          fix_difficulty: 'easy',
          impact: null,
        },
      ],
      error: null,
    });

    mockSend.mockRejectedValueOnce(new Error('Resend API down'));

    const res = await GET(makeRequest('Bearer cron-secret-123'));
    const json = await res.json();

    expect(json.errors).toBe(1);
    expect(json.sent).toBe(0);
    expect(captureApiError).toHaveBeenCalledWith(
      expect.any(Error),
      '/api/email/sequence',
      'GET',
      500,
      expect.objectContaining({ leadId: 'lead-err', step: 1 })
    );
  });
});
