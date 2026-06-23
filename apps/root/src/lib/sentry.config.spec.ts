/**
 * `sentryEnabled` is evaluated at module load, so each case mocks its deps then
 * re-requires the module in isolation.
 */
describe('sentryEnabled gating', () => {
  afterEach(() => {
    jest.resetModules();
  });

  const loadWith = (dsn: string, production: boolean): boolean => {
    let enabled = false;
    jest.isolateModules(() => {
      jest.doMock('@/lib/public.env', () => ({
        publicEnv: {
          NEXT_PUBLIC_SENTRY_CONFIG_ID: dsn,
          NEXT_PUBLIC_NODE_ENV: production ? 'production' : 'development',
        },
      }));
      jest.doMock('@/utils/helpers', () => ({
        isProduction: () => production,
      }));
      enabled = (require('./sentry.config') as { sentryEnabled: boolean })
        .sentryEnabled;
    });
    return enabled;
  };

  const DSN = 'https://abc@o1.ingest.us.sentry.io/123';

  it('is false when no DSN is set, even in production', () => {
    expect(loadWith('', true)).toBe(false);
  });

  it('is false in development even with a DSN (no local/dev reporting)', () => {
    expect(loadWith(DSN, false)).toBe(false);
  });

  it('is true only in production with a DSN', () => {
    expect(loadWith(DSN, true)).toBe(true);
  });
});
