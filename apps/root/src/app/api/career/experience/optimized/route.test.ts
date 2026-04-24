/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server';
import { proxyToFastAPI, verifyJobsAccess } from '@/app/api/jobs/proxy';
import { GET } from './route';

jest.mock('@/app/api/jobs/proxy', () => ({
  verifyJobsAccess: jest.fn(),
  proxyToFastAPI: jest.fn(),
}));

const mockedVerify = verifyJobsAccess as jest.MockedFunction<
  typeof verifyJobsAccess
>;
const mockedProxy = proxyToFastAPI as jest.MockedFunction<
  typeof proxyToFastAPI
>;

describe('GET /api/career/experience/optimized', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedVerify.mockResolvedValueOnce(false);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('proxies to FastAPI /experience/optimized when authenticated', async () => {
    mockedVerify.mockResolvedValueOnce(true);
    mockedProxy.mockResolvedValueOnce(NextResponse.json({ optimized: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockedProxy).toHaveBeenCalledWith('/experience/optimized');
  });
});
