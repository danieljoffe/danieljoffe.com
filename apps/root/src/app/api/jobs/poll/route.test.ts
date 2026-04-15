/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from '../proxy';
import { POST } from './route';

jest.mock('../proxy', () => ({
  verifyJobsAdmin: jest.fn(),
  proxyToFastAPI: jest.fn(),
  IS_MOCK_MODE: true,
}));

const mockedVerify = verifyJobsAdmin as jest.MockedFunction<
  typeof verifyJobsAdmin
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
  });

  it('returns 200 with a matching cron bearer token', async () => {
    process.env['CRON_SECRET'] = 'cron-token-abc';
    // Verify should not be called when cron matches.
    const res = await POST(
      createRequest({ authorization: 'Bearer cron-token-abc' })
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.sources_polled).toBeDefined();
    expect(mockedVerify).not.toHaveBeenCalled();
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

  it('returns 200 for authenticated admin session (no cron)', async () => {
    delete process.env['CRON_SECRET'];
    mockedVerify.mockResolvedValueOnce(true);
    const res = await POST(createRequest());
    expect(res.status).toBe(200);
    expect(mockedProxy).not.toHaveBeenCalled();
  });
});
