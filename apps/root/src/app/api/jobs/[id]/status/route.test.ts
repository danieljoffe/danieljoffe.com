/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { verifyJobsAdmin } from '../../proxy';
import { POST } from './route';

jest.mock('../../proxy', () => ({
  verifyJobsAdmin: jest.fn(),
  proxyToFastAPI: jest.fn(),
  IS_MOCK_MODE: true,
}));

const mockedVerify = verifyJobsAdmin as jest.MockedFunction<
  typeof verifyJobsAdmin
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
  });

  it('returns 200 and echoes new status in mock mode', async () => {
    mockedVerify.mockResolvedValueOnce(true);
    const res = await POST(createRequest({ status: 'applied' }), {
      params: Promise.resolve({ id: 'job-123' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.new_status).toBe('applied');
  });
});
