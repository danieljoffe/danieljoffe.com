const mockCreateClient = jest.fn().mockReturnValue({ from: jest.fn() });
jest.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}));

jest.mock('@/utils/helpers', () => ({
  devLog: jest.fn(),
}));

describe('createServerSupabaseClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when environment variables are missing', () => {
    delete process.env['NEXT_PUBLIC_SUPABASE_URL'];
    delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

    jest.isolateModules(() => {
      const { createServerSupabaseClient } = require('../server');
      expect(createServerSupabaseClient()).toBeNull();
    });
  });

  it('creates a client with auth options when env vars are set', () => {
    process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'https://test.supabase.co';
    process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'test-service-key';

    jest.isolateModules(() => {
      const { createServerSupabaseClient } = require('../server');
      const client = createServerSupabaseClient();
      expect(client).toBeDefined();
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        expect.objectContaining({
          auth: { autoRefreshToken: false, persistSession: false },
        })
      );
    });
  });
});
