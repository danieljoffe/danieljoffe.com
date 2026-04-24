/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../../proxy';
import { GET } from './route';

jest.mock('../../proxy', () => ({
  verifyJobsAccess: jest.fn(),
  proxyToFastAPI: jest.fn(),
}));

const mockedVerify = verifyJobsAccess as jest.MockedFunction<
  typeof verifyJobsAccess
>;
const mockedProxy = proxyToFastAPI as jest.MockedFunction<
  typeof proxyToFastAPI
>;

function createRequest(query: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/jobs/sources/detect?q=${encodeURIComponent(query)}`,
    { method: 'GET' }
  );
}

describe('GET /api/jobs/sources/detect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedVerify.mockResolvedValueOnce(false);
    const res = await GET(createRequest('stripe'));
    expect(res.status).toBe(401);
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('proxies to FastAPI /sources/detect with search params', async () => {
    mockedVerify.mockResolvedValueOnce(true);
    mockedProxy.mockResolvedValueOnce(
      NextResponse.json({
        found: true,
        provider: 'greenhouse',
        board_token: 'stripe',
        company_name: 'Stripe',
        job_count: 42,
      })
    );
    const res = await GET(createRequest('stripe'));
    expect(res.status).toBe(200);
    expect(mockedProxy).toHaveBeenCalledWith(
      '/sources/detect',
      expect.objectContaining({
        searchParams: expect.any(URLSearchParams),
      })
    );
  });
});
