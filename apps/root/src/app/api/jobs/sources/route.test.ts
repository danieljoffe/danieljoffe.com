/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { verifyJobsAdmin } from '../proxy';
import { MOCK_SOURCES } from '../mockData';
import { GET, POST } from './route';

jest.mock('../proxy', () => ({
  verifyJobsAdmin: jest.fn(),
  proxyToFastAPI: jest.fn(),
  IS_MOCK_MODE: true,
}));

const mockedVerify = verifyJobsAdmin as jest.MockedFunction<
  typeof verifyJobsAdmin
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
    });

    it('returns 200 with the mock sources list', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(Array.isArray(json.sources)).toBe(true);
    });
  });

  describe('POST', () => {
    it('returns 401 when unauthenticated', async () => {
      mockedVerify.mockResolvedValueOnce(false);
      const res = await POST(createPost({ action: 'seed' }));
      expect(res.status).toBe(401);
    });

    it('seed action returns success with seeded count', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      const res = await POST(createPost({ action: 'seed' }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(typeof json.seeded).toBe('number');
    });

    it('toggle action flips enabled on an existing source', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      const target = MOCK_SOURCES[0];
      if (!target) throw new Error('expected at least one mock source');
      const before = target.enabled;
      const res = await POST(
        createPost({ action: 'toggle', board_token: target.board_token })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.enabled).toBe(!before);
      // Restore state so other tests aren't affected.
      target.enabled = before;
    });

    it('toggle action returns 404 for an unknown board_token', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      const res = await POST(
        createPost({ action: 'toggle', board_token: 'does-not-exist-xyz' })
      );
      expect(res.status).toBe(404);
    });

    it('add action inserts a new source', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      const res = await POST(
        createPost({
          action: 'add',
          board_token: 'test-new-source',
          company_name: 'Test New Source',
        })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.source.board_token).toBe('test-new-source');
      // Cleanup.
      const idx = MOCK_SOURCES.findIndex(
        s => s.board_token === 'test-new-source'
      );
      if (idx >= 0) MOCK_SOURCES.splice(idx, 1);
    });

    it('add action returns 409 on duplicate board_token', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      const existing = MOCK_SOURCES[0];
      if (!existing) throw new Error('expected at least one mock source');
      const res = await POST(
        createPost({
          action: 'add',
          board_token: existing.board_token,
          company_name: 'dup',
        })
      );
      expect(res.status).toBe(409);
    });

    it('remove action deletes an existing source', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      // Insert a temp source to safely remove.
      MOCK_SOURCES.push({
        id: 'src-temp',
        board_token: 'temp-remove',
        company_name: 'Temp',
        enabled: true,
        last_polled_at: null,
        job_count: 0,
      });
      const res = await POST(
        createPost({ action: 'remove', board_token: 'temp-remove' })
      );
      expect(res.status).toBe(200);
      expect(MOCK_SOURCES.some(s => s.board_token === 'temp-remove')).toBe(
        false
      );
    });

    it('unknown action returns 400', async () => {
      mockedVerify.mockResolvedValueOnce(true);
      const res = await POST(
        createPost({ action: 'bogus' } as unknown as { action: 'seed' })
      );
      expect(res.status).toBe(400);
    });
  });
});
