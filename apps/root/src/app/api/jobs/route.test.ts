/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from './proxy';
import { GET } from './route';

jest.mock('./proxy', () => ({
  verifyJobsAdmin: jest.fn(),
  proxyToFastAPI: jest.fn(),
}));

const mockedVerify = verifyJobsAdmin as jest.MockedFunction<
  typeof verifyJobsAdmin
>;
const mockedProxy = proxyToFastAPI as jest.MockedFunction<
  typeof proxyToFastAPI
>;

function createRequest(): NextRequest {
  return new NextRequest('http://localhost/api/jobs?minScore=50', {
    method: 'GET',
  });
}

describe('GET /api/jobs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedVerify.mockResolvedValueOnce(false);
    const res = await GET(createRequest());
    expect(res.status).toBe(401);
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('proxies to FastAPI with search params', async () => {
    mockedVerify.mockResolvedValueOnce(true);
    mockedProxy.mockResolvedValueOnce(
      NextResponse.json({ postings: [], total: 0 })
    );
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(mockedProxy).toHaveBeenCalledWith(
      '/jobs',
      expect.objectContaining({
        searchParams: expect.any(URLSearchParams),
      })
    );
  });
});
