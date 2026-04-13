const mockCreateClient = jest.fn().mockReturnValue({ from: jest.fn() });
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

describe('createBrowserSupabaseClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when environment variables are missing', () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL'];
    delete process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];

    // Re-import to get fresh module with cleared env
    jest.isolateModules(() => {
      const { createBrowserSupabaseClient: freshCreate } = require('../client');
      expect(() => freshCreate()).toThrow(/missing/i);
    });
  });

  it('creates a client when environment variables are set', () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co';
    process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] = 'test-anon-key';

    jest.isolateModules(() => {
      const { createBrowserSupabaseClient: freshCreate } = require('../client');
      const client = freshCreate();
      expect(client).toBeDefined();
    });
  });
});
