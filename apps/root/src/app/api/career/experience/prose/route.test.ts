/**
 * @jest-environment node
 */
import { NextResponse } from 'next/server';
import { proxyToFastAPI, verifyJobsAdmin } from '@/app/api/jobs/proxy';
import { GET } from './route';

jest.mock('@/app/api/jobs/proxy', () => ({
  verifyJobsAdmin: jest.fn(),
  proxyToFastAPI: jest.fn(),
}));

const mockedVerify = verifyJobsAdmin as jest.MockedFunction<
  typeof verifyJobsAdmin
>;
const mockedProxy = proxyToFastAPI as jest.MockedFunction<
  typeof proxyToFastAPI
>;

describe('GET /api/career/experience/prose', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedVerify.mockResolvedValueOnce(false);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('proxies to FastAPI /experience/prose when authenticated', async () => {
    mockedVerify.mockResolvedValueOnce(true);
    mockedProxy.mockResolvedValueOnce(NextResponse.json({ prose: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(mockedProxy).toHaveBeenCalledWith('/experience/prose');
  });
});
