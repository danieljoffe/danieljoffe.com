/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from './route';
import { resetRateLimit } from '../rateLimit';

jest.mock('@/lib/errorTracking', () => ({
  captureApiError: jest.fn(),
}));

function createRequest(body: Record<string, unknown>, ip = '1.2.3.4') {
  return new NextRequest('http://localhost/api/audit/admin/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/audit/admin/verify', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env['AUDIT_ADMIN_PASSWORD'] = 'test-admin-pass';
    // Reset rate limiter state between tests
    resetRateLimit('1.2.3.4');
    resetRateLimit('5.6.7.8');
  });

  afterEach(() => {
    delete process.env['AUDIT_ADMIN_PASSWORD'];
  });

  it('returns 200 with valid: true for correct password', async () => {
    const res = await POST(createRequest({ password: 'test-admin-pass' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.valid).toBe(true);
  });

  it('returns 401 for wrong password', async () => {
    const res = await POST(createRequest({ password: 'wrong' }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(createRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('Password is required');
  });

  it('returns 503 when env var is not configured', async () => {
    delete process.env['AUDIT_ADMIN_PASSWORD'];
    const res = await POST(createRequest({ password: 'anything' }));
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.error).toBe('Admin not configured');
  });

  describe('rate limiting', () => {
    it('returns 429 after 5 failed attempts from the same IP', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await POST(createRequest({ password: 'wrong' }));
        expect(res.status).toBe(401);
      }

      const res = await POST(createRequest({ password: 'wrong' }));
      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.error).toMatch(/too many attempts/i);
      expect(json.retryAfter).toBeGreaterThan(0);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });

    it('tracks IPs independently', async () => {
      for (let i = 0; i < 5; i++) {
        await POST(createRequest({ password: 'wrong' }, '1.2.3.4'));
      }

      // IP 1.2.3.4 is now locked out
      const blocked = await POST(
        createRequest({ password: 'wrong' }, '1.2.3.4')
      );
      expect(blocked.status).toBe(429);

      // Different IP should still work
      const allowed = await POST(
        createRequest({ password: 'wrong' }, '5.6.7.8')
      );
      expect(allowed.status).toBe(401);
    });

    it('resets counter after successful login', async () => {
      // Use 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await POST(createRequest({ password: 'wrong' }));
      }

      // Successful login resets the counter
      const success = await POST(
        createRequest({ password: 'test-admin-pass' })
      );
      expect(success.status).toBe(200);

      // Should be able to fail again without hitting limit
      for (let i = 0; i < 5; i++) {
        const res = await POST(createRequest({ password: 'wrong' }));
        expect(res.status).toBe(401);
      }
    });

    it('blocks even correct password when rate limited', async () => {
      for (let i = 0; i < 5; i++) {
        await POST(createRequest({ password: 'wrong' }));
      }

      const res = await POST(createRequest({ password: 'test-admin-pass' }));
      expect(res.status).toBe(429);
    });
  });
});
