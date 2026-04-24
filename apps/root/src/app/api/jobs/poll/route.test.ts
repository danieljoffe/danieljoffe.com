/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../proxy';
import { POST } from './route';

jest.mock('../proxy', () => ({
  verifyJobsAccess: jest.fn(),
  proxyToFastAPI: jest.fn(),
}));

const mockedVerify = verifyJobsAccess as jest.MockedFunction<
  typeof verifyJobsAccess
>;
const mockedProxy = proxyToFastAPI as jest.MockedFunction<
  typeof proxyToFastAPI
>;

function createRequest(headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/jobs/poll', {
    method: 'POST',
    headers,
  });
}

const originalCronSecret = process.env['CRON_SECRET'];

describe('POST /api/jobs/poll', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalCronSecret === undefined) {
      delete process.env['CRON_SECRET'];
    } else {
      process.env['CRON_SECRET'] = originalCronSecret;
    }
  });

  it('returns 401 when unauthenticated and no cron bearer', async () => {
    delete process.env['CRON_SECRET'];
    mockedVerify.mockResolvedValueOnce(false);
    const res = await POST(createRequest());
    expect(res.status).toBe(401);
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('proxies to FastAPI with a matching cron bearer token', async () => {
    process.env['CRON_SECRET'] = 'cron-token-abc';
    mockedProxy.mockResolvedValueOnce(
      NextResponse.json({ sources_polled: 5, new_jobs: 2 })
    );
    const res = await POST(
      createRequest({ authorization: 'Bearer cron-token-abc' })
    );
    expect(res.status).toBe(200);
    expect(mockedVerify).not.toHaveBeenCalled();
    expect(mockedProxy).toHaveBeenCalledWith('/poll', { method: 'POST' });
  });

  it('returns 401 when cron bearer token is wrong length (constant-time compare)', async () => {
    process.env['CRON_SECRET'] = 'cron-token-abc';
    mockedVerify.mockResolvedValueOnce(false);
    const res = await POST(createRequest({ authorization: 'Bearer wrong' }));
    expect(res.status).toBe(401);
  });

  it('returns 401 when cron bearer token is same-length but mismatched', async () => {
    process.env['CRON_SECRET'] = 'cron-token-abc';
    mockedVerify.mockResolvedValueOnce(false);
    const res = await POST(
      createRequest({ authorization: 'Bearer xxxx-xxxxx-xxx' })
    );
    expect(res.status).toBe(401);
  });

  it('proxies to FastAPI for authenticated admin session (no cron)', async () => {
    delete process.env['CRON_SECRET'];
    mockedVerify.mockResolvedValueOnce(true);
    mockedProxy.mockResolvedValueOnce(
      NextResponse.json({ sources_polled: 5, new_jobs: 2 })
    );
    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    expect(mockedProxy).toHaveBeenCalledWith('/poll', { method: 'POST' });
  });
});
