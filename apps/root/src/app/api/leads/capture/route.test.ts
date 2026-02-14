/**
 * @jest-environment node
 */
import { POST } from './route';

// Supabase mock chain types
interface SelectChain {
  eq: jest.Mock;
  single: jest.Mock;
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

// Mock Resend
const mockSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: (...args: unknown[]) => mockSend(...args),
    },
  })),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
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
        data: { url: 'https://example.com' },
        error: null,
      }),
    };

    const dupCheckChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'existing-lead-id' },
        error: null,
      }),
    };

    mockFrom
      .mockReturnValueOnce({
        select: jest.fn(() => scanLookupChain),
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

  it('captures lead and sends email', async () => {
    const scanId = '550e8400-e29b-41d4-a716-446655440000';

    const scanLookupChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { url: 'https://example.com' },
        error: null,
      }),
    };

    const dupCheckChain: SelectChain = {
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' },
      }),
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
    expect(mockSend).toHaveBeenCalled();
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
