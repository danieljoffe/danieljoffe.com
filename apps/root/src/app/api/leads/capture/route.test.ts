/**
 * @jest-environment node
 */
import { POST } from './route';

// Supabase mock chain types
interface SelectChain {
  eq: jest.Mock;
  single: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
}

interface InsertChain {
  select: jest.Mock;
  single: jest.Mock;
}

interface TableMock {
  select?: jest.Mock;
  insert?: jest.Mock;
}

// Mock Supabase
const mockSingle = jest.fn();
const mockSelectChain = jest.fn(
  (): SelectChain => ({
    eq: jest.fn().mockReturnThis(),
    single: mockSingle,
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  })
);
const mockInsertChain = jest.fn(
  (): InsertChain => ({
    select: jest.fn().mockReturnThis(),
    single: mockSingle,
  })
);

const mockFrom = jest.fn(
  (): TableMock => ({
    select: mockSelectChain,
    insert: mockInsertChain,
  })
);

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

// Mock Resend via the new resend module
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

// Mock the email template to avoid JSX rendering in tests
jest.mock('@/components/emails/FullReport', () => ({
  __esModule: true,
  default: jest.fn(() => '<FullReportEmail />'),
}));

function createRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/leads/capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/leads/capture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['NEXT_PUBLIC_SITE_URL'] = 'https://danieljoffe.com';
    process.env['RESEND_API_KEY'] = 'test-resend-key';
    process.env['UNSUBSCRIBE_SECRET'] = 'test-secret';
  });

  it('returns 400 for missing email', async () => {
    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('email');
  });

  it('returns 400 for invalid email', async () => {
    const req = createRequest({ email: 'not-an-email' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed scan_id', async () => {
    const req = createRequest({
      email: 'user@example.com',
      scan_id: 'bad-uuid',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid scan ID');
  });

  it('returns already_captured for duplicate email+scan_id', async () => {
    const scanId = '550e8400-e29b-41d4-a716-446655440000';

    const scanLookupChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          url: 'https://example.com',
          grade_overall: 'C',
          score_performance: 60,
          score_accessibility: 70,
          score_seo: 80,
          score_best_practices: 65,
        },
        error: null,
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    // Issues lookup chain (returns after scan query)
    const issuesChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: [], error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null }),
    };

    const dupCheckChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'existing-lead-id' },
        error: null,
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    mockFrom
      .mockReturnValueOnce({
        select: jest.fn(() => scanLookupChain),
      } as TableMock)
      .mockReturnValueOnce({
        select: jest.fn(() => issuesChain),
      } as TableMock)
      .mockReturnValueOnce({
        select: jest.fn(() => dupCheckChain),
      } as TableMock);

    const req = createRequest({ email: 'user@example.com', scan_id: scanId });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('already_captured');
    expect(json.lead_id).toBe('existing-lead-id');
  });

  it('captures lead and sends email with react template', async () => {
    const scanId = '550e8400-e29b-41d4-a716-446655440000';

    const scanLookupChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: {
          url: 'https://example.com',
          grade_overall: 'C',
          score_performance: 60,
          score_accessibility: 70,
          score_seo: 80,
          score_best_practices: 65,
        },
        error: null,
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const issuesChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: [], error: null }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({
        data: [
          {
            title: 'Images not compressed',
            severity: 'warning',
            category: 'performance',
          },
        ],
        error: null,
      }),
    };

    const dupCheckChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    const insertChain: InsertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'new-lead-id' },
        error: null,
      }),
    };

    const emailLogInsert: InsertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    mockFrom
      .mockReturnValueOnce({
        select: jest.fn(() => scanLookupChain),
      } as TableMock)
      .mockReturnValueOnce({
        select: jest.fn(() => issuesChain),
      } as TableMock)
      .mockReturnValueOnce({
        select: jest.fn(() => dupCheckChain),
      } as TableMock)
      .mockReturnValueOnce({ insert: jest.fn(() => insertChain) } as TableMock)
      .mockReturnValueOnce({
        insert: jest.fn(() => emailLogInsert),
      } as TableMock);

    mockSend.mockResolvedValueOnce({
      data: { id: 'resend-msg-id' },
      error: null,
    });

    const req = createRequest({
      email: 'user@example.com',
      name: 'Jane',
      company: 'Acme',
      scan_id: scanId,
      source: 'full_report',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('captured');
    expect(json.lead_id).toBe('new-lead-id');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        react: expect.anything(),
      })
    );
  });

  it('captures lead even when email send fails', async () => {
    const insertChain: InsertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'new-lead-id' },
        error: null,
      }),
    };

    mockFrom.mockReturnValueOnce({
      insert: jest.fn(() => insertChain),
    } as TableMock);

    mockSend.mockRejectedValueOnce(new Error('Resend is down'));

    const req = createRequest({ email: 'user@example.com' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('captured');
    expect(json.lead_id).toBe('new-lead-id');
  });
});
