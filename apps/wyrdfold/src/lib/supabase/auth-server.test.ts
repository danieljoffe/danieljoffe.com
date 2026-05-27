/**
 * @jest-environment node
 */
const mockCreateServerClient = jest.fn(() => ({ auth: { _tag: 'server' } }));
const mockConnection = jest.fn().mockResolvedValue(undefined);
const mockCookieStore = {
  getAll: jest.fn().mockReturnValue([{ name: 'sb-token', value: 'abc' }]),
  set: jest.fn(),
};
const mockCookies = jest.fn().mockResolvedValue(mockCookieStore);

jest.mock('@supabase/ssr', () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

jest.mock('next/headers', () => ({
  cookies: () => mockCookies(),
}));

jest.mock('next/server', () => ({
  connection: () => mockConnection(),
}));

const ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_ID'];

describe('createAuthServerClient', () => {
  const originalEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    jest.resetModules();
    mockCreateServerClient.mockClear();
    mockConnection.mockClear();
    mockCookies.mockClear();
    mockCookieStore.getAll.mockClear();
    mockCookieStore.set.mockClear();
    for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = originalEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('awaits connection() before reading env or cookies', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://supabase.test';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] = 'anon-key';

    const { createAuthServerClient } = await import('./auth-server');
    await createAuthServerClient();
    expect(mockConnection).toHaveBeenCalledTimes(1);
  });

  it('passes the URL, anon key, and cookie adapter to createServerClient', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://supabase.test';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] = 'anon-key';

    const { createAuthServerClient } = await import('./auth-server');
    const client = await createAuthServerClient();

    expect(mockCreateServerClient).toHaveBeenCalledTimes(1);
    const [url, key, opts] = mockCreateServerClient.mock.calls[0] as [
      string,
      string,
      { cookies: { getAll: () => unknown; setAll: (c: unknown[]) => void } },
    ];
    expect(url).toBe('https://supabase.test');
    expect(key).toBe('anon-key');
    expect(opts.cookies.getAll()).toEqual([{ name: 'sb-token', value: 'abc' }]);
    expect(client).toEqual({ auth: { _tag: 'server' } });
  });

  it('cookie adapter setAll() forwards each entry to cookieStore.set', async () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://supabase.test';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] = 'anon-key';

    const { createAuthServerClient } = await import('./auth-server');
    await createAuthServerClient();

    const [, , opts] = mockCreateServerClient.mock.calls[0] as [
      string,
      string,
      {
        cookies: {
          setAll: (
            c: { name: string; value: string; options: unknown }[]
          ) => void;
        };
      },
    ];
    opts.cookies.setAll([
      { name: 'a', value: '1', options: { path: '/' } },
      { name: 'b', value: '2', options: { httpOnly: true } },
    ]);
    expect(mockCookieStore.set).toHaveBeenNthCalledWith(1, 'a', '1', {
      path: '/',
    });
    expect(mockCookieStore.set).toHaveBeenNthCalledWith(2, 'b', '2', {
      httpOnly: true,
    });
  });

  it('cookie adapter setAll() swallows cookieStore.set throws (Server Component context)', async () => {
    // Next.js throws "Cookies can only be modified in a Server Action or
    // Route Handler" when ``cookieStore.set`` is called from a Server
    // Component. If we let that bubble, ``getAccessToken``'s catch
    // collapses the whole session to null and every SSR fetch falls
    // back to the "no data" state — even though the access token is
    // perfectly valid. Suppress the write here; middleware refreshes.
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://supabase.test';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] = 'anon-key';
    mockCookieStore.set.mockImplementation(() => {
      throw new Error('Cookies can only be modified in a Server Action');
    });

    const { createAuthServerClient } = await import('./auth-server');
    await createAuthServerClient();

    const [, , opts] = mockCreateServerClient.mock.calls[0] as [
      string,
      string,
      {
        cookies: {
          setAll: (
            c: { name: string; value: string; options: unknown }[]
          ) => void;
        };
      },
    ];
    expect(() =>
      opts.cookies.setAll([{ name: 'a', value: '1', options: { path: '/' } }])
    ).not.toThrow();
  });

  it('throws when env vars are missing', async () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL'];
    delete process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];

    const { createAuthServerClient } = await import('./auth-server');
    await expect(createAuthServerClient()).rejects.toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/
    );
    expect(mockCreateServerClient).not.toHaveBeenCalled();
  });
});
