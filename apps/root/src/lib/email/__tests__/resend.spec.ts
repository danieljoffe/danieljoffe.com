jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation((key: string) => ({ key })),
}));

describe('createResendClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when RESEND_API_KEY is missing', () => {
    delete process.env['RESEND_API_KEY'];

    jest.isolateModules(() => {
      const { createResendClient } = require('../resend');
      expect(createResendClient()).toBeNull();
    });
  });

  it('creates a Resend client when API key is set', () => {
    process.env['RESEND_API_KEY'] = 'test-api-key';

    jest.isolateModules(() => {
      const { createResendClient } = require('../resend');
      const client = createResendClient();
      expect(client).toBeDefined();
    });
  });

  it('exports email constants', () => {
    jest.isolateModules(() => {
      const { EMAIL_FROM, EMAIL_TO } = require('../resend');
      expect(EMAIL_FROM).toContain('Daniel Joffe');
      expect(EMAIL_TO).toBe('hello@danieljoffe.com');
    });
  });
});
