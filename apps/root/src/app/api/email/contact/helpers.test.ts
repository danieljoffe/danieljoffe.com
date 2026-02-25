/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { formSchema } from './schema';

const mockSend = jest.fn();

// Mock dependencies before importing the module under test
jest.mock('@/lib/env', () => ({
  serverEnv: {
    VALIDKIT_API_KEY: 'test-validkit-key',
    VALIDKIT_API_URL: 'https://api.validkit.test/validate',
    NODE_ENV: 'test',
  },
}));

jest.mock('@/lib/email/resend', () => ({
  createResendClient: jest.fn(() => ({ emails: { send: mockSend } })),
  EMAIL_FROM: 'Test <test@test.com>',
  EMAIL_TO: 'recipient@test.com',
}));

jest.mock('@/components/emails/ContactNotification', () => ({
  __esModule: true,
  default: jest.fn(() => '<mock-email />'),
}));

jest.mock('@/utils/helpers', () => ({
  devLog: jest.fn(),
}));

jest.mock('@/lib/public.env', () => ({
  publicEnv: { NEXT_PUBLIC_NODE_ENV: 'test' },
}));

import {
  validateFormData,
  validateEmail,
  sendEmail,
  requestFromSource,
  rateLimit,
} from './helpers';

describe('validateFormData', () => {
  const validData = {
    name: 'John Doe',
    email: 'john@example.com',
    message:
      'This is a test message that is long enough to pass the minimum length requirement.',
    hcaptcha: 'test-token',
  };

  it('returns null for valid data', async () => {
    const result = await validateFormData(validData, formSchema);
    expect(result).toBeNull();
  });

  it('throws 403 for honeypot field filled', async () => {
    const spamData = { ...validData, address: 'spam-bot-filled-this' };
    await expect(validateFormData(spamData, formSchema)).rejects.toMatchObject({
      statusCode: 403,
      error: { message: 'Forbidden' },
    });
  });

  it('does not throw for empty honeypot field', async () => {
    const data = { ...validData, address: '' };
    const result = await validateFormData(data, formSchema);
    expect(result).toBeNull();
  });

  it('throws 400 for invalid email', async () => {
    const badData = { ...validData, email: 'not-an-email' };
    await expect(validateFormData(badData, formSchema)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws 400 for missing required fields', async () => {
    const badData = { ...validData, name: '' };
    await expect(validateFormData(badData, formSchema)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('throws 400 for message with URLs', async () => {
    const badData = {
      ...validData,
      message:
        'Check out https://spam.com for more info and other details here',
    };
    await expect(validateFormData(badData, formSchema)).rejects.toMatchObject({
      statusCode: 400,
    });
  });
});

describe('validateEmail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns null for valid email', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ valid: true }),
    });

    const result = await validateEmail('test@example.com');
    expect(result).toBeNull();
  });

  it('throws when ValidKit returns an error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: () =>
        Promise.resolve({
          error: {
            message: 'Invalid email',
            code: 'INVALID_EMAIL',
            statusCode: 400,
          },
        }),
    });

    await expect(validateEmail('bad@email.com')).rejects.toMatchObject({
      statusCode: 400,
      error: { path: 'email', message: 'Invalid email' },
    });
  });

  it('throws 500 when API key is missing', async () => {
    // Temporarily override the mock
    const envModule = require('@/lib/env');
    const original = envModule.serverEnv.VALIDKIT_API_KEY;
    envModule.serverEnv.VALIDKIT_API_KEY = '';

    await expect(validateEmail('test@example.com')).rejects.toMatchObject({
      statusCode: 500,
    });

    envModule.serverEnv.VALIDKIT_API_KEY = original;
  });
});

describe('sendEmail', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('returns null on successful send', async () => {
    mockSend.mockResolvedValue({ data: { id: 'resend-123' }, error: null });

    const result = await sendEmail({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'Hello',
      hcaptcha: 'token',
    });
    expect(result).toBeNull();
  });

  it('sends with correct Resend payload', async () => {
    mockSend.mockResolvedValue({ data: { id: 'resend-123' }, error: null });

    await sendEmail({
      name: 'Jane',
      email: 'jane@example.com',
      message: 'Hello',
      hcaptcha: 'token',
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Test <test@test.com>',
        to: 'recipient@test.com',
        replyTo: 'jane@example.com',
        subject: 'New message from Jane',
        react: expect.anything(),
      })
    );
  });

  it('throws 500 when Resend API key is missing', async () => {
    const resendModule = require('@/lib/email/resend');
    resendModule.createResendClient.mockReturnValueOnce(null);

    await expect(
      sendEmail({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'Hello',
        hcaptcha: 'token',
      })
    ).rejects.toMatchObject({ statusCode: 500 });
  });

  it('throws 500 when Resend returns an error', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'Rate limited' },
    });

    await expect(
      sendEmail({
        name: 'Jane',
        email: 'jane@example.com',
        message: 'Hello',
        hcaptcha: 'token',
      })
    ).rejects.toMatchObject({
      statusCode: 500,
      error: { path: 'root.serviceError' },
    });
  });
});

describe('requestFromSource', () => {
  function makeRequest(referer?: string): NextRequest {
    const headers = new Headers();
    if (referer) {
      headers.set('referer', referer);
    }
    return new NextRequest('https://danieljoffe.com/api/email/contact', {
      headers,
    });
  }

  it('returns null when referer matches source', async () => {
    const req = makeRequest('https://danieljoffe.com/about');
    const result = await requestFromSource(req, '/about');
    expect(result).toBeNull();
  });

  it('throws 403 when referer is missing', async () => {
    const req = makeRequest();
    await expect(requestFromSource(req, '/about')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 403 when referer does not match source', async () => {
    const req = makeRequest('https://danieljoffe.com/projects');
    await expect(requestFromSource(req, '/about')).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('rateLimit', () => {
  function makeRequest(ip: string): NextRequest {
    const headers = new Headers();
    headers.set('x-forwarded-for', ip);
    return new NextRequest('https://danieljoffe.com/api/email/contact', {
      headers,
    });
  }

  // Clear rate limit store between tests
  beforeEach(() => {
    const store = globalThis as typeof globalThis & {
      __apiRateLimitStore?: Map<string, unknown>;
    };
    if (store.__apiRateLimitStore) {
      store.__apiRateLimitStore.clear();
    }
  });

  it('returns null within rate limit', async () => {
    const req = makeRequest('192.168.1.1');
    const result = await rateLimit(req);
    expect(result).toBeNull();
  });

  it('throws 403 when no IP is available', async () => {
    const req = new NextRequest('https://danieljoffe.com/api/email/contact');
    await expect(rateLimit(req)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 429 when rate limit is exceeded', async () => {
    const ip = '10.0.0.99';

    // Make requests up to the limit (5)
    for (let i = 0; i < 5; i++) {
      await rateLimit(makeRequest(ip));
    }

    // 6th request should be rate limited
    await expect(rateLimit(makeRequest(ip))).rejects.toMatchObject({
      statusCode: 429,
      error: { message: 'Too many requests. Please try again later.' },
    });
  });

  it('uses x-real-ip as fallback', async () => {
    const headers = new Headers();
    headers.set('x-real-ip', '172.16.0.1');
    const req = new NextRequest('https://danieljoffe.com/api/email/contact', {
      headers,
    });
    const result = await rateLimit(req);
    expect(result).toBeNull();
  });
});
