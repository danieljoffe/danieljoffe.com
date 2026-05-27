/**
 * @jest-environment node
 */
// proxy.ts captures WYRDFOLD_API_URL at module load — set before import.
process.env['WYRDFOLD_API_URL'] = 'http://wyrdfold-api.test';

const mockGetSession = jest.fn();

jest.mock('@/lib/supabase/auth-server', () => ({
  createAuthServerClient: () =>
    Promise.resolve({ auth: { getSession: mockGetSession } }),
}));

import {
  fetchJsonFromWyrdfoldAPI,
  proxyMultipartToWyrdfoldAPI,
  proxyStreamingToWyrdfoldAPI,
  proxyToWyrdfoldAPI,
} from './proxy';

const ORIGINAL_FETCH = global.fetch;

afterAll(() => {
  global.fetch = ORIGINAL_FETCH;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: 'jwt-token' } },
  });
});

function mockFetch(response: Response): jest.Mock {
  const fn = jest.fn().mockResolvedValue(response);
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('proxyToWyrdfoldAPI', () => {
  it('returns 401 when no Supabase session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const fetchMock = mockFetch(new Response('{}'));

    const res = await proxyToWyrdfoldAPI('/experience/optimized');

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 401 when getSession throws', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('cookie error'));
    const fetchMock = mockFetch(new Response('{}'));

    const res = await proxyToWyrdfoldAPI('/experience/optimized');

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the access token as Bearer auth and returns upstream JSON', async () => {
    const fetchMock = mockFetch(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await proxyToWyrdfoldAPI('/experience/optimized');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://wyrdfold-api.test/experience/optimized');
    expect(init.method).toBe('GET');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer jwt-token'
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('appends search params to the upstream URL', async () => {
    const fetchMock = mockFetch(new Response('{}', { status: 200 }));

    await proxyToWyrdfoldAPI('/jobs', {
      searchParams: new URLSearchParams({ status: 'open', page: '2' }),
    });

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://wyrdfold-api.test/jobs?status=open&page=2');
  });

  it('serializes the request body as JSON when provided', async () => {
    const fetchMock = mockFetch(new Response('{}', { status: 201 }));

    await proxyToWyrdfoldAPI('/jobs', {
      method: 'POST',
      body: { title: 'Senior FE' },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ title: 'Senior FE' }));
  });

  it('returns 502 when upstream returns non-JSON', async () => {
    mockFetch(new Response('<html>oops</html>', { status: 200 }));

    const res = await proxyToWyrdfoldAPI('/experience/optimized');

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: 'Upstream returned non-JSON',
      upstreamStatus: 200,
    });
  });

  it('returns 503 when fetch rejects', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const res = await proxyToWyrdfoldAPI('/experience/optimized');

    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      error: 'WyrdFold API unavailable',
    });
  });

  it('passes through binary bodies with upstream Content-Type and Disposition', async () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    mockFetch(
      new Response(bytes, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="export.zip"',
        },
      })
    );

    const res = await proxyToWyrdfoldAPI('/exports/zip', { binary: true });

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/zip');
    expect(res.headers.get('Content-Disposition')).toBe(
      'attachment; filename="export.zip"'
    );
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(buf)).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });
});

describe('proxyStreamingToWyrdfoldAPI', () => {
  function makeRequest(): Request {
    return new Request('http://localhost/api/stream', { method: 'POST' });
  }

  it('returns 401 when no Supabase session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const fetchMock = mockFetch(new Response('{}'));

    const res = await proxyStreamingToWyrdfoldAPI(
      '/experience/derive/stream',
      makeRequest()
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes the body stream through with SSE headers on success', async () => {
    const sseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: hello\n\n'));
        controller.close();
      },
    });
    mockFetch(
      new Response(sseBody, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      })
    );

    const res = await proxyStreamingToWyrdfoldAPI(
      '/experience/derive/stream',
      makeRequest(),
      { body: { hint: 'go' } }
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform');
    expect(res.headers.get('X-Accel-Buffering')).toBe('no');
    expect(await res.text()).toBe('data: hello\n\n');
  });

  it('surfaces upstream JSON errors before any SSE frames', async () => {
    mockFetch(
      new Response(JSON.stringify({ detail: 'budget exceeded' }), {
        status: 429,
      })
    );

    const res = await proxyStreamingToWyrdfoldAPI(
      '/experience/derive/stream',
      makeRequest()
    );

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ detail: 'budget exceeded' });
  });

  it('returns 503 when upstream fetch rejects', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('boom')) as unknown as typeof fetch;

    const res = await proxyStreamingToWyrdfoldAPI(
      '/experience/derive/stream',
      makeRequest()
    );

    expect(res.status).toBe(503);
  });
});

describe('proxyMultipartToWyrdfoldAPI', () => {
  function makeMultipartRequest(): Request {
    return new Request('http://localhost/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'multipart/form-data; boundary=---x' },
      body: '---x\r\nContent-Disposition: form-data; name="file"\r\n\r\nhi\r\n---x--',
    });
  }

  it('returns 401 when no Supabase session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const fetchMock = mockFetch(new Response('{}'));

    const res = await proxyMultipartToWyrdfoldAPI(
      '/experience/upload-resume',
      makeMultipartRequest()
    );

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the multipart Content-Type and JWT to upstream', async () => {
    const fetchMock = mockFetch(
      new Response(JSON.stringify({ uploaded: true }), { status: 200 })
    );

    const res = await proxyMultipartToWyrdfoldAPI(
      '/experience/upload-resume',
      makeMultipartRequest()
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://wyrdfold-api.test/experience/upload-resume');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer jwt-token');
    expect(headers['Content-Type']).toBe('multipart/form-data; boundary=---x');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ uploaded: true });
  });

  it('returns 502 when upstream returns non-JSON', async () => {
    mockFetch(new Response('<html>err</html>', { status: 500 }));

    const res = await proxyMultipartToWyrdfoldAPI(
      '/experience/upload-resume',
      makeMultipartRequest()
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toMatchObject({
      error: 'Upstream returned non-JSON',
      upstreamStatus: 500,
    });
  });
});

describe('fetchJsonFromWyrdfoldAPI retry behavior', () => {
  it('returns parsed JSON on first success without retrying', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 76 })));
    global.fetch = fn as unknown as typeof fetch;

    const result = await fetchJsonFromWyrdfoldAPI<{ total: number }>('/jobs');
    expect(result).toEqual({ total: 76 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries once on a thrown fetch error then succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total: 76 })));
    global.fetch = fn as unknown as typeof fetch;

    const result = await fetchJsonFromWyrdfoldAPI<{ total: number }>('/jobs');
    expect(result).toEqual({ total: 76 });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries once on a 5xx response then succeeds', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce(new Response('boom', { status: 502 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    global.fetch = fn as unknown as typeof fetch;

    const result = await fetchJsonFromWyrdfoldAPI<{ ok: boolean }>('/jobs');
    expect(result).toEqual({ ok: true });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on 4xx (protocol-level rejection)', async () => {
    const fn = jest
      .fn()
      .mockResolvedValueOnce(new Response('nope', { status: 404 }));
    global.fetch = fn as unknown as typeof fetch;

    const result = await fetchJsonFromWyrdfoldAPI<unknown>('/jobs');
    expect(result).toBeNull();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('returns null after exhausting retries on persistent errors', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('ECONNRESET'));
    global.fetch = fn as unknown as typeof fetch;

    const result = await fetchJsonFromWyrdfoldAPI<unknown>('/jobs', {
      retries: 2,
    });
    expect(result).toBeNull();
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('skips the upstream round-trip when there is no session', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    const fn = jest.fn();
    global.fetch = fn as unknown as typeof fetch;

    const result = await fetchJsonFromWyrdfoldAPI<unknown>('/jobs');
    expect(result).toBeNull();
    expect(fn).not.toHaveBeenCalled();
  });
});
