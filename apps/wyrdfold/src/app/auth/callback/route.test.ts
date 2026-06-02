/**
 * @jest-environment node
 *
 * Tests the auth/callback route's two-flow handling:
 *  - token_hash + type → verifyOtp (PKCE-free, cross-browser invites)
 *  - code              → exchangeCodeForSession (PKCE, same-browser)
 *
 * The bug this guards against: clicking an invite/recovery email in a
 * different browser than the inviter's must not require a code_verifier
 * cookie. Before the fix the callback only handled `?code=...`, which
 * meant invites bounced with `pkce_code_verifier_not_found`.
 */

const mockVerifyOtp = jest.fn();
const mockExchangeCode = jest.fn();
const mockCaptureException = jest.fn();
const mockCaptureMessage = jest.fn();
const mockCookieGet = jest.fn<{ value: string } | undefined, [string]>();

jest.mock('next/headers', () => ({
  cookies: async () => ({ get: mockCookieGet }),
}));

jest.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

jest.mock('@/lib/supabase/auth-server', () => ({
  createAuthServerClient: async () => ({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      exchangeCodeForSession: (...args: unknown[]) => mockExchangeCode(...args),
    },
  }),
}));

import { GET } from './route';

const ORIGIN = 'https://wyrdfold.com';

function makeRequest(query: string): Request {
  return new Request(`${ORIGIN}/auth/callback?${query}`);
}

describe('auth/callback GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCookieGet.mockReturnValue(undefined);
  });

  describe('token_hash flow (invites, recovery, cross-browser)', () => {
    it('calls verifyOtp and redirects to /dashboard on success', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const res = await GET(makeRequest('token_hash=abc123&type=invite'));

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'abc123',
        type: 'invite',
      });
      expect(mockExchangeCode).not.toHaveBeenCalled();
      expect(res.headers.get('location')).toBe(`${ORIGIN}/dashboard`);
    });

    it('accepts every documented OTP type', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      const types = [
        'invite',
        'recovery',
        'magiclink',
        'signup',
        'email',
        'email_change',
      ];
      for (const t of types) {
        mockVerifyOtp.mockClear();
        const res = await GET(makeRequest(`token_hash=tok&type=${t}`));
        expect(mockVerifyOtp).toHaveBeenCalledWith({
          token_hash: 'tok',
          type: t,
        });
        expect(res.headers.get('location')).toBe(`${ORIGIN}/dashboard`);
      }
    });

    it('bounces to /login with the OTP error code on failure', async () => {
      mockVerifyOtp.mockResolvedValue({
        error: { code: 'otp_expired', message: 'expired' },
      });

      const res = await GET(makeRequest('token_hash=abc&type=invite'));

      expect(res.headers.get('location')).toBe(
        `${ORIGIN}/login?auth_error=otp_expired`
      );
      expect(mockCaptureException).toHaveBeenCalled();
    });

    it('ignores an unknown otp type (defensive — falls through to missing_code)', async () => {
      const res = await GET(makeRequest('token_hash=abc&type=bogus'));

      expect(mockVerifyOtp).not.toHaveBeenCalled();
      expect(res.headers.get('location')).toBe(
        `${ORIGIN}/login?auth_error=missing_code`
      );
    });
  });

  describe('PKCE code flow (same-browser magic-link sign-in)', () => {
    it('exchanges the code and redirects to /dashboard', async () => {
      mockExchangeCode.mockResolvedValue({ error: null });

      const res = await GET(makeRequest('code=pkce-code'));

      expect(mockExchangeCode).toHaveBeenCalledWith('pkce-code');
      expect(mockVerifyOtp).not.toHaveBeenCalled();
      expect(res.headers.get('location')).toBe(`${ORIGIN}/dashboard`);
    });

    it('bounces to /login when the verifier cookie is missing', async () => {
      mockExchangeCode.mockResolvedValue({
        error: { code: 'pkce_code_verifier_not_found', message: 'no verifier' },
      });

      const res = await GET(makeRequest('code=pkce-code'));

      expect(res.headers.get('location')).toBe(
        `${ORIGIN}/login?auth_error=pkce_code_verifier_not_found`
      );
    });

    it('prefers token_hash over code when both are present', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });

      const res = await GET(
        makeRequest('code=pkce&token_hash=tok&type=recovery')
      );

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: 'tok',
        type: 'recovery',
      });
      expect(mockExchangeCode).not.toHaveBeenCalled();
      expect(res.headers.get('location')).toBe(`${ORIGIN}/dashboard`);
    });
  });

  describe('error pass-through and missing-params', () => {
    it('surfaces a supabase-side error param without calling the client', async () => {
      const res = await GET(
        makeRequest('error=otp_expired&error_description=expired')
      );

      expect(mockVerifyOtp).not.toHaveBeenCalled();
      expect(mockExchangeCode).not.toHaveBeenCalled();
      expect(res.headers.get('location')).toBe(
        `${ORIGIN}/login?auth_error=otp_expired`
      );
    });

    it('bounces with missing_code when neither code nor token_hash is present', async () => {
      const res = await GET(makeRequest(''));

      expect(res.headers.get('location')).toBe(
        `${ORIGIN}/login?auth_error=missing_code`
      );
      expect(mockCaptureMessage).toHaveBeenCalled();
    });
  });

  describe('next destination', () => {
    it('honours the wyrdfold_login_next cookie over the query param', async () => {
      mockVerifyOtp.mockResolvedValue({ error: null });
      mockCookieGet.mockReturnValue({
        value: encodeURIComponent('/settings'),
      });

      const res = await GET(
        makeRequest('token_hash=t&type=invite&next=/should-be-ignored')
      );

      expect(res.headers.get('location')).toBe(`${ORIGIN}/settings`);
    });

    it('rejects open-redirect attempts and falls back to /dashboard', async () => {
      mockExchangeCode.mockResolvedValue({ error: null });

      const res = await GET(
        makeRequest(`code=c&next=${encodeURIComponent('//evil.com')}`)
      );

      expect(res.headers.get('location')).toBe(`${ORIGIN}/dashboard`);
    });
  });
});
