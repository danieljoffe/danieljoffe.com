/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI, IS_MOCK_MODE } from './proxy';
import { queryMockPostings } from './mockData';
import { GET } from './route';

jest.mock('./proxy', () => ({
  verifyJobsAdmin: jest.fn(),
  proxyToFastAPI: jest.fn(),
  IS_MOCK_MODE: true,
}));

jest.mock('./mockData', () => ({
  queryMockPostings: jest.fn(),
}));

const mockedVerify = verifyJobsAdmin as jest.MockedFunction<
  typeof verifyJobsAdmin
>;
const mockedProxy = proxyToFastAPI as jest.MockedFunction<
  typeof proxyToFastAPI
>;
const mockedQuery = queryMockPostings as jest.MockedFunction<
  typeof queryMockPostings
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
  });

  it('returns 200 with mock data when IS_MOCK_MODE is true', async () => {
    mockedVerify.mockResolvedValueOnce(true);
    mockedQuery.mockReturnValueOnce({
      postings: [],
      total: 0,
      page: 1,
      page_size: 20,
    });
    const res = await GET(createRequest());
    expect(res.status).toBe(200);
    expect(mockedQuery).toHaveBeenCalled();
    // Proxy must NOT be called in mock mode.
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('proxies to FastAPI when IS_MOCK_MODE is false', async () => {
    // Override the proxy mock so IS_MOCK_MODE is false for this test
    // by re-requiring with jest.isolateModules.
    jest.isolateModules(() => {
      jest.doMock('./proxy', () => ({
        verifyJobsAdmin: jest.fn().mockResolvedValue(true),
        proxyToFastAPI: jest
          .fn()
          .mockResolvedValue(NextResponse.json({ ok: true })),
        IS_MOCK_MODE: false,
      }));
      jest.doMock('./mockData', () => ({ queryMockPostings: jest.fn() }));

      const { GET: GET2 } = require('./route');

      const proxy = require('./proxy');
      return GET2(createRequest()).then((res: Response) => {
        expect(res.status).toBe(200);
        expect(proxy.proxyToFastAPI).toHaveBeenCalledWith(
          '/jobs',
          expect.objectContaining({
            searchParams: expect.any(URLSearchParams),
          })
        );
      });
    });
    // Touch the import so the linter doesn't complain
    void IS_MOCK_MODE;
  });
});
