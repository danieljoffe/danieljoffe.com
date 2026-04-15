/**
 * @jest-environment node
 */
jest.mock('@/lib/adminSession', () => ({
  readAdminSession: jest.fn(),
}));

import { readAdminSession } from '@/lib/adminSession';
import { GET } from './route';

const mockedReadAdminSession = readAdminSession as jest.MockedFunction<
  typeof readAdminSession
>;

describe('GET /api/tools/session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when no session cookie is present', async () => {
    mockedReadAdminSession.mockResolvedValueOnce(null);
    const res = await GET();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.authenticated).toBe(false);
  });

  it('returns 200 when a valid session exists', async () => {
    mockedReadAdminSession.mockResolvedValueOnce({ sub: 'tools-admin' });
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.authenticated).toBe(true);
  });
});
