/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

// Mock next/server's after() to execute callbacks immediately in tests
const afterCallbacks: Array<() => Promise<void>> = [];
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server');
  return {
    ...actual,
    after: (cb: () => Promise<void>) => {
      afterCallbacks.push(cb);
    },
  };
});

// Mock Supabase
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

const mockFrom = jest.fn(() => ({
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
}));

jest.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({ from: mockFrom }),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

// Mock global fetch for scan service trigger
const originalFetch = global.fetch;

function createRequest(body: Record<string, unknown>, ip = '1.2.3.4') {
  return new NextRequest('http://localhost/api/audit/scan', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/audit/scan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    afterCallbacks.length = 0;
    global.fetch = jest.fn().mockResolvedValue(new Response('ok'));
    process.env['SCAN_SERVICE_URL'] = 'http://scan-service:3001';
    process.env['SCAN_SERVICE_API_KEY'] = 'test-key';
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('returns 400 when URL is missing', async () => {
    const req = createRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('URL is required');
  });

  it('returns 400 for invalid URL', async () => {
    const req = createRequest({ url: 'http://localhost:3000' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Invalid or disallowed URL');
  });

  it('returns 400 for private IP URLs', async () => {
    const req = createRequest({ url: 'http://192.168.1.1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 429 when rate limited', async () => {
    // Rate limit check: count returns 5
    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 10 });

    const req = createRequest({ url: 'https://example.com' });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.error).toContain('Rate limit');
  });

  it('returns cached result if recent scan exists', async () => {
    // Rate limit check: under limit
    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 0 });

    // Cache check: found completed scan
    const cacheChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'cached-scan-id', status: 'completed' },
        error: null,
      }),
    };
    mockSelect.mockReturnValueOnce(cacheChain);

    const req = createRequest({ url: 'https://example.com' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scan_id).toBe('cached-scan-id');
    expect(json.cached).toBe(true);
    expect(json.status).toBe('completed');
  });

  it('creates a new scan and returns scan_id', async () => {
    // Rate limit check: under limit
    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 0 });

    // Cache check: no cached result
    const cacheChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSelect.mockReturnValueOnce(cacheChain);

    // Insert scan
    const insertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'new-scan-id' },
        error: null,
      }),
    };
    mockInsert.mockReturnValueOnce(insertChain);

    const req = createRequest({
      url: 'https://example.com',
      source: 'organic',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scan_id).toBe('new-scan-id');
    expect(json.status).toBe('pending');
  });

  it('passes device_mode in scan insert', async () => {
    // Rate limit check: under limit
    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 0 });

    // Cache check: no cached result
    const cacheChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSelect.mockReturnValueOnce(cacheChain);

    // Insert scan
    const insertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'desktop-scan-id' },
        error: null,
      }),
    };
    mockInsert.mockReturnValueOnce(insertChain);

    const req = createRequest({
      url: 'https://example.com',
      device: 'desktop',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Verify insert was called with device_mode
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ device_mode: 'desktop' })
    );
  });

  it('creates two scans for both mode', async () => {
    // Rate limit check: under limit
    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 0 });

    // Two inserts (mobile + desktop)
    const mobileInsertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'mobile-scan-id' },
        error: null,
      }),
    };
    const desktopInsertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'desktop-scan-id' },
        error: null,
      }),
    };
    mockInsert
      .mockReturnValueOnce(mobileInsertChain)
      .mockReturnValueOnce(desktopInsertChain);

    // Two paired_scan_id updates
    const updateChain = { eq: jest.fn().mockResolvedValue({ error: null }) };
    mockUpdate.mockReturnValue(updateChain);

    const req = createRequest({
      url: 'https://example.com',
      device: 'both',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.scan_id).toBe('mobile-scan-id');
    expect(json.desktop_scan_id).toBe('desktop-scan-id');
    expect(json.device).toBe('both');
  });

  it('returns 503 when SCAN_SERVICE_URL is missing', async () => {
    delete process.env['SCAN_SERVICE_URL'];

    // Rate limit check: under limit
    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 0 });

    // Cache check: no cached result
    const cacheChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSelect.mockReturnValueOnce(cacheChain);

    const req = createRequest({ url: 'https://example.com' });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toContain('not configured');
    // Crucially: no scan row was inserted
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('returns 503 when SCAN_SERVICE_API_KEY is missing', async () => {
    delete process.env['SCAN_SERVICE_API_KEY'];

    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 0 });

    const cacheChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSelect.mockReturnValueOnce(cacheChain);

    const req = createRequest({ url: 'https://example.com' });
    const res = await POST(req);
    expect(res.status).toBe(503);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('marks scan failed when scan service returns non-2xx', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('boom', { status: 500 }));

    const rateLimitChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
    };
    mockSelect.mockReturnValueOnce(rateLimitChain);
    rateLimitChain.gte.mockResolvedValueOnce({ count: 0 });

    const cacheChain = {
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockSelect.mockReturnValueOnce(cacheChain);

    const insertChain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'scan-500' },
        error: null,
      }),
    };
    mockInsert.mockReturnValueOnce(insertChain);

    const updateChain = { eq: jest.fn().mockResolvedValue({ error: null }) };
    mockUpdate.mockReturnValue(updateChain);

    const req = createRequest({ url: 'https://example.com' });
    const res = await POST(req);
    expect(res.status).toBe(200);

    // Flush after() callbacks captured by the mock
    for (const cb of afterCallbacks) await cb();

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        error_message: expect.stringContaining('HTTP 500'),
      })
    );
  });

  it('returns 500 on unexpected error', async () => {
    // Make Supabase throw
    mockSelect.mockImplementationOnce(() => {
      throw new Error('DB connection failed');
    });

    const req = createRequest({ url: 'https://example.com' });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });
});
