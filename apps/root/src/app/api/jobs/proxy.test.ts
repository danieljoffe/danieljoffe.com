/**
 * @jest-environment node
 */
const mockGetUser = jest.fn();

jest.mock('@/lib/adminSession', () => ({
  readAdminSession: jest.fn(),
  readAdminSessionToken: jest.fn(),
}));
jest.mock('@/lib/supabase/auth-server', () => ({
  createAuthServerClient: () =>
    Promise.resolve({ auth: { getUser: mockGetUser } }),
}));

import { readAdminSession } from '@/lib/adminSession';
import { verifyJobsAccess } from './proxy';

const mockedReadAdminSession = readAdminSession as jest.MockedFunction<
  typeof readAdminSession
>;

describe('verifyJobsAccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when an admin session exists', async () => {
    mockedReadAdminSession.mockResolvedValueOnce({ sub: 'tools-admin' });
    await expect(verifyJobsAccess()).resolves.toBe(true);
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('returns true when Supabase session exists (no admin session)', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'user-123' } },
    });
    await expect(verifyJobsAccess()).resolves.toBe(true);
  });

  it('returns false when neither admin nor Supabase session exists', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(verifyJobsAccess()).resolves.toBe(false);
  });

  it('returns false when Supabase auth throws', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    mockGetUser.mockRejectedValueOnce(new Error('cookie error'));
    await expect(verifyJobsAccess()).resolves.toBe(false);
  });
});
