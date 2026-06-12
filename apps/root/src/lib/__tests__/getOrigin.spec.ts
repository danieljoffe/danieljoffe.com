import { DOMAIN_URL } from '@/utils/constants';
import { getOrigin } from '../getOrigin';

const mockHeadersGet = jest.fn();
jest.mock('next/headers', () => ({
  headers: () => Promise.resolve({ get: mockHeadersGet }),
}));

describe('getOrigin', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.VERCEL_ENV;
    delete process.env.VERCEL_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns DOMAIN_URL on Vercel production, even when VERCEL_URL is set', async () => {
    // VERCEL_URL is the *.vercel.app deployment URL behind Deployment
    // Protection — using it for self-fetches returns the auth wall.
    process.env.VERCEL_ENV = 'production';
    process.env.VERCEL_URL = 'danieljoffe-com-abc123.vercel.app';

    await expect(getOrigin()).resolves.toBe(DOMAIN_URL);
  });

  it('returns the VERCEL_URL deployment origin on previews', async () => {
    process.env.VERCEL_ENV = 'preview';
    process.env.VERCEL_URL = 'danieljoffe-com-abc123.vercel.app';

    await expect(getOrigin()).resolves.toBe(
      'https://danieljoffe-com-abc123.vercel.app'
    );
  });

  it('falls back to the host header in development', async () => {
    mockHeadersGet.mockReturnValue('localhost:3000');

    await expect(getOrigin()).resolves.toBe('http://localhost:3000');
  });

  it('uses https for non-localhost hosts', async () => {
    mockHeadersGet.mockReturnValue('example.test');

    await expect(getOrigin()).resolves.toBe('https://example.test');
  });
});
