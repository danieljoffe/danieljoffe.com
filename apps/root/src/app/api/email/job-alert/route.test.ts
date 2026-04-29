/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';

const mockSend = jest.fn();
jest.mock('@/lib/email/resend', () => ({
  createResendClient: jest.fn(() => ({
    emails: { send: (...args: unknown[]) => mockSend(...args) },
  })),
  EMAIL_FROM: 'Daniel Joffe <noreply@danieljoffe.com>',
}));

jest.mock('@/lib/email/tokens', () => ({
  buildProfileUnsubscribeUrl: jest.fn(
    (id: string, category: string) =>
      `https://danieljoffe.com/api/email/profile/unsubscribe?profile_id=${id}&category=${category}&token=test`
  ),
}));

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

jest.mock('@/components/emails/JobAlert', () => ({
  __esModule: true,
  default: jest.fn(() => '<JobAlertEmail />'),
}));

function makeRequest(
  body: unknown,
  opts: { auth?: string | null } = {}
): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (opts.auth !== null) {
    headers['Authorization'] = opts.auth ?? 'Bearer test-secret';
  }
  return new NextRequest('https://example.com/api/email/job-alert', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  profileId: '11111111-2222-3333-4444-555555555555',
  to: 'me@example.com',
  jobId: 'job-1',
  title: 'Senior Frontend Engineer',
  company: 'Acme',
  location: 'Remote, US',
  score: 85,
  jobUrl: 'https://example.com/jobs/1',
};

describe('POST /api/email/job-alert', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      JOB_ALERT_SECRET: 'test-secret',
      RESEND_API_KEY: 'test-resend-key',
      NEXT_PUBLIC_SITE_URL: 'https://danieljoffe.com',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 401 without a bearer token', async () => {
    const res = await POST(makeRequest(VALID_BODY, { auth: null }));
    expect(res.status).toBe(401);
  });

  it('returns 401 with a wrong bearer token', async () => {
    const res = await POST(makeRequest(VALID_BODY, { auth: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 503 when JOB_ALERT_SECRET is unset', async () => {
    delete process.env['JOB_ALERT_SECRET'];
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(503);
  });

  it('returns 400 when payload is malformed', async () => {
    const res = await POST(makeRequest({ profileId: 'x' }));
    expect(res.status).toBe(400);
  });

  it('sends the email and returns the resend id on success', async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: 'resend-xyz' },
      error: null,
    });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, resendId: 'resend-xyz' });

    expect(mockSend).toHaveBeenCalledTimes(1);
    const args = mockSend.mock.calls[0][0];
    expect(args.to).toBe('me@example.com');
    expect(args.subject).toContain('Senior Frontend Engineer');
    expect(args.subject).toContain('Acme');
  });

  it('attaches RFC 8058 List-Unsubscribe + List-Unsubscribe-Post headers', async () => {
    mockSend.mockResolvedValueOnce({
      data: { id: 'resend-xyz' },
      error: null,
    });
    await POST(makeRequest(VALID_BODY));
    const args = mockSend.mock.calls[0][0];
    expect(args.headers['List-Unsubscribe']).toMatch(
      /^<https:\/\/danieljoffe\.com\/api\/email\/profile\/unsubscribe\?profile_id=/
    );
    expect(args.headers['List-Unsubscribe']).toContain('category=job_alerts');
    expect(args.headers['List-Unsubscribe-Post']).toBe(
      'List-Unsubscribe=One-Click'
    );
  });

  it('returns 502 when Resend reports an error', async () => {
    mockSend.mockResolvedValueOnce({
      data: null,
      error: { message: 'Resend exploded' },
    });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(502);
  });
});
