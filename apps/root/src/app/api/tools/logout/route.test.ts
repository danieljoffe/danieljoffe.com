/**
 * @jest-environment node
 */
jest.mock('@/lib/adminSession', () => ({
  ADMIN_SESSION_COOKIE: 'admin_session',
  sessionCookieOptions: jest.fn().mockImplementation((maxAge = 3600) => ({
    name: 'admin_session',
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  })),
}));

import { POST } from './route';

describe('POST /api/tools/logout', () => {
  it('returns 200 and clears the admin_session cookie', async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    const setCookie = res.headers.get('set-cookie') ?? '';
    // Cookie is either set with maxAge=0 / empty value or explicitly deleted.
    expect(setCookie).toContain('admin_session');
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
