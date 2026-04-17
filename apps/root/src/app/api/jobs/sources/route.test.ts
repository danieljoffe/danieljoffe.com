/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from '../proxy';
import { GET, POST } from './route';

jest.mock('../proxy', () => ({
  verifyJobsAdmin: jest.fn(),
  proxyToFastAPI: jest.fn(),
}));

const mockedVerify = verifyJobsAdmin as jest.MockedFunction<
  typeof verifyJobsAdmin
>;
const mockedProxy = proxyToFastAPI as jest.MockedFunction<
  typeof proxyToFastAPI
>;

function createPost(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/jobs/sources', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/api/jobs/sources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedVerify.mockResolvedValueOnce(false);
      const res = await GET();
      expect(res.status).toBe(401);
      expect(mockedProxy).not.toHaveBeenCalled();
    });

    it('proxies to FastAPI /sources', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      mockedProxy.mockResolvedValueOnce(NextResponse.json({ sources: [] }));
      const res = await GET();
      expect(res.status).toBe(200);
      expect(mockedProxy).toHaveBeenCalledWith('/sources');
    });
  });

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedVerify.mockResolvedValueOnce(false);
      const res = await POST(createPost({ action: 'seed' }));
      expect(res.status).toBe(401);
      expect(mockedProxy).not.toHaveBeenCalled();
    });

    it('proxies seed action to /sources/seed', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      mockedProxy.mockResolvedValueOnce(
        NextResponse.json({ success: true, seeded: 5 })
      );
      const res = await POST(createPost({ action: 'seed' }));
      expect(res.status).toBe(200);
      expect(mockedProxy).toHaveBeenCalledWith('/sources/seed', {
        method: 'POST',
        body: { action: 'seed' },
      });
    });

    it('proxies toggle action to /sources', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      mockedProxy.mockResolvedValueOnce(
        NextResponse.json({ success: true, enabled: false })
      );
      const body = { action: 'toggle', board_token: 'stripe' };
      const res = await POST(createPost(body));
      expect(res.status).toBe(200);
      expect(mockedProxy).toHaveBeenCalledWith('/sources', {
        method: 'POST',
        body,
      });
    });

    it('proxies add action to /sources', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      mockedProxy.mockResolvedValueOnce(NextResponse.json({ success: true }));
      const body = {
        action: 'add',
        board_token: 'newco',
        company_name: 'NewCo',
      };
      const res = await POST(createPost(body));
      expect(res.status).toBe(200);
      expect(mockedProxy).toHaveBeenCalledWith('/sources', {
        method: 'POST',
        body,
      });
    });

    it('proxies remove action to /sources', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      mockedProxy.mockResolvedValueOnce(NextResponse.json({ success: true }));
      const body = { action: 'remove', board_token: 'oldco' };
      const res = await POST(createPost(body));
      expect(res.status).toBe(200);
      expect(mockedProxy).toHaveBeenCalledWith('/sources', {
        method: 'POST',
        body,
      });
    });
  });
});
