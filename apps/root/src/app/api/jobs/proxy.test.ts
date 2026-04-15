/**
 * @jest-environment node
 */
jest.mock('@/lib/adminSession', () => ({
  readAdminSession: jest.fn(),
  readAdminSessionToken: jest.fn(),
}));

import { readAdminSession } from '@/lib/adminSession';
import { verifyJobsAdmin } from './proxy';

const mockedReadAdminSession = readAdminSession as jest.MockedFunction<
  typeof readAdminSession
>;

describe('verifyJobsAdmin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when a valid session exists', async () => {
    mockedReadAdminSession.mockResolvedValueOnce({ sub: 'tools-admin' });
    await expect(verifyJobsAdmin()).resolves.toBe(true);
  });

  it('returns false when no session exists', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    await expect(verifyJobsAdmin()).resolves.toBe(false);
  });
});
