/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  resetRateLimit,
} from '@/app/api/audit/admin/rateLimit';
import { mintSessionToken } from '@/lib/adminSession';
import { POST } from './route';

jest.mock('@/lib/adminSession', () => ({
  mintSessionToken: jest.fn().mockResolvedValue('mock-token'),
  sessionCookieOptions: jest.fn().mockReturnValue({
    name: 'admin_session',
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 3600,
  }),
}));

jest.mock('@/app/api/audit/admin/rateLimit', () => ({
  checkRateLimit: jest.fn(),
  resetRateLimit: jest.fn(),
}));

const mockedCheckRateLimit = checkRateLimit as jest.MockedFunction<
  typeof checkRateLimit
>;
const mockedResetRateLimit = resetRateLimit as jest.MockedFunction<
  typeof resetRateLimit
>;
const mockedMint = mintSessionToken as jest.MockedFunction<
  typeof mintSessionToken
>;

function createRequest(
  body: unknown,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest('http://localhost/api/tools/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

const originalPassword = process.env['TOOLS_ADMIN_PASSWORD'];

describe('POST /api/tools/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCheckRateLimit.mockReturnValue({
      blocked: false,
      retryAfterSeconds: 0,
    });
    process.env['TOOLS_ADMIN_PASSWORD'] = 'correct-password';
  });

  afterAll(() => {
    if (originalPassword === undefined) {
      delete process.env['TOOLS_ADMIN_PASSWORD'];
    } else {
      process.env['TOOLS_ADMIN_PASSWORD'] = originalPassword;
    }
  });

  it('returns 503 when TOOLS_ADMIN_PASSWORD is missing', async () => {
    delete process.env['TOOLS_ADMIN_PASSWORD'];
    const res = await POST(createRequest({ password: 'anything' }));
    expect(res.status).toBe(503);
  });

  it('returns 401 when password is wrong', async () => {
    const res = await POST(createRequest({ password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(mockedMint).not.toHaveBeenCalled();
  });

  it('returns 429 when rate-limit blocks the IP', async () => {
    mockedCheckRateLimit.mockReturnValueOnce({
      blocked: true,
      retryAfterSeconds: 900,
    });
    const res = await POST(createRequest({ password: 'correct-password' }));
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('900');
    const json = await res.json();
    expect(json.retryAfterSeconds).toBe(900);
  });

  it('returns 200 and mints a session cookie on correct password', async () => {
    const res = await POST(createRequest({ password: 'correct-password' }));
    expect(res.status).toBe(200);
    expect(mockedMint).toHaveBeenCalled();
    expect(mockedResetRateLimit).toHaveBeenCalled();
    const setCookie = res.headers.get('set-cookie') ?? '';
    expect(setCookie).toContain('admin_session=mock-token');
  });

  it('returns 400 on invalid JSON body', async () => {
    const req = new NextRequest('http://localhost/api/tools/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not-json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('prefers x-real-ip over x-forwarded-for when both present', async () => {
    await POST(
      createRequest(
        { password: 'correct-password' },
        {
          'x-real-ip': '10.0.0.1',
          'x-forwarded-for': '1.2.3.4, 5.6.7.8',
        }
      )
    );
    expect(mockedCheckRateLimit).toHaveBeenCalledWith('10.0.0.1');
  });

  it('uses the last element of x-forwarded-for when x-real-ip is absent', async () => {
    await POST(
      createRequest(
        { password: 'correct-password' },
        { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.9.9.9' }
      )
    );
    expect(mockedCheckRateLimit).toHaveBeenCalledWith('9.9.9.9');
  });

  it('falls back to "unknown" when no IP headers present', async () => {
    await POST(createRequest({ password: 'correct-password' }));
    expect(mockedCheckRateLimit).toHaveBeenCalledWith('unknown');
  });

  it('simulated lockout: after many calls, next call returns 429', async () => {
    // First N calls pass.
    for (let i = 0; i < 5; i++) {
      mockedCheckRateLimit.mockReturnValueOnce({
        blocked: false,
        retryAfterSeconds: 0,
      });
      const res = await POST(createRequest({ password: 'wrong' }));
      expect(res.status).toBe(401);
    }
    // Sixth call is blocked.
    mockedCheckRateLimit.mockReturnValueOnce({
      blocked: true,
      retryAfterSeconds: 600,
    });
    const res = await POST(createRequest({ password: 'wrong' }));
    expect(res.status).toBe(429);
  });
});
