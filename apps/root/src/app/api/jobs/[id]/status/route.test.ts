/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJobsAccess, proxyToFastAPI } from '../../proxy';
import { POST } from './route';

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

function createRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/jobs/job-123/status', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/jobs/[id]/status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockedVerify.mockResolvedValueOnce(false);
    const res = await POST(createRequest({ status: 'saved' }), {
      params: Promise.resolve({ id: 'job-123' }),
    });
    expect(res.status).toBe(401);
    expect(mockedProxy).not.toHaveBeenCalled();
  });

  it('proxies status update to FastAPI', async () => {
    mockedVerify.mockResolvedValueOnce(true);
    mockedProxy.mockResolvedValueOnce(
      NextResponse.json({
        success: true,
        old_status: 'new',
        new_status: 'applied',
      })
    );
    const body = { status: 'applied' };
    const res = await POST(createRequest(body), {
      params: Promise.resolve({ id: 'job-123' }),
    });
    expect(res.status).toBe(200);
    expect(mockedProxy).toHaveBeenCalledWith('/jobs/job-123/status', {
      method: 'POST',
      body,
    });
  });
});
