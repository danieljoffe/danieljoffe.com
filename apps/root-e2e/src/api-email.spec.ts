import { test, expect } from '@playwright/test';
import { VALID_FORM_DATA, INVALID_FORM_DATA } from './fixtures/test-data';

const API_URL = '/api/email';

// Each test invocation gets a globally unique IP to avoid rate limit
// interference when multiple browser projects (chromium, firefox, webkit,
// mobile) hit the shared dev server in parallel.  A monotonic counter
// combined with a random suffix guarantees uniqueness across workers and
// retries within the same test run.
let _ipCounter = 0;
function headersWithUniqueIP() {
  return {
    'Content-Type': 'application/json',
    referer: 'http://localhost:3000/about',
    'x-forwarded-for': `10.${process.pid}.${++_ipCounter}.${Date.now()}`,
  };
}

const validPayload = {
  ...VALID_FORM_DATA,
  hcaptcha: 'mock-hcaptcha-token',
};

test.describe('the API /api/email - Request Validation', () => {
  test('rejects request without referer header', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': `no-referer-${process.pid}-${Date.now()}`,
      },
      data: validPayload,
    });

    const body = await response.json();
    expect(body.statusCode).toBe(403);
  });

  test('rejects request with wrong referer', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: {
        'Content-Type': 'application/json',
        referer: 'http://localhost:3000/projects',
        'x-forwarded-for': `wrong-referer-${process.pid}-${Date.now()}`,
      },
      data: validPayload,
    });

    const body = await response.json();
    expect(body.statusCode).toBe(403);
  });

  // Note: "rejects request without x-forwarded-for header" test removed because
  // Next.js 16 auto-populates x-forwarded-for from the socket remote address,
  // making it impossible to simulate a missing IP via direct HTTP request.
});

test.describe('the API /api/email - Form Validation', () => {
  test('rejects empty fields', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: headersWithUniqueIP(),
      data: { name: '', email: '', message: '', hcaptcha: '' },
    });

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('rejects short name', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: headersWithUniqueIP(),
      data: {
        ...validPayload,
        name: INVALID_FORM_DATA.shortName,
      },
    });

    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(body.error.path).toContain('name');
  });

  test('rejects invalid email', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: headersWithUniqueIP(),
      data: {
        ...validPayload,
        email: INVALID_FORM_DATA.invalidEmail,
      },
    });

    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(body.error.path).toContain('email');
  });

  test('rejects short message', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: headersWithUniqueIP(),
      data: {
        ...validPayload,
        message: INVALID_FORM_DATA.shortMessage,
      },
    });

    const body = await response.json();
    expect(body.error).toBeTruthy();
    expect(body.error.path).toContain('message');
  });

  test('rejects message containing URLs', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: headersWithUniqueIP(),
      data: {
        ...validPayload,
        message: INVALID_FORM_DATA.messageWithUrl,
      },
    });

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  test('rejects missing hcaptcha token', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: headersWithUniqueIP(),
      data: {
        name: VALID_FORM_DATA.name,
        email: VALID_FORM_DATA.email,
        message: VALID_FORM_DATA.message,
      },
    });

    const body = await response.json();
    expect(body.error).toBeTruthy();
  });
});

test.describe('aPI /api/email - Honeypot', () => {
  test('rejects request with honeypot field filled', async ({ request }) => {
    const response = await request.post(API_URL, {
      headers: headersWithUniqueIP(),
      data: {
        ...validPayload,
        address: '123 Spam Street',
      },
    });

    const body = await response.json();
    expect(body.statusCode).toBe(403);
  });
});

test.describe('aPI /api/email - Rate Limiting', () => {
  test('enforces rate limit after 5 requests from same IP', async ({
    request,
  }) => {
    const uniqueIP = `rate-limit-test-${Date.now()}`;
    const headers = {
      'Content-Type': 'application/json',
      referer: 'http://localhost:3000/about',
      'x-forwarded-for': uniqueIP,
    };

    // Send 5 requests (should all pass rate limit check)
    for (let i = 0; i < 5; i++) {
      await request.post(API_URL, {
        headers,
        data: validPayload,
      });
    }

    // 6th request should be rate limited
    const response = await request.post(API_URL, {
      headers,
      data: validPayload,
    });

    const body = await response.json();
    expect(body.statusCode).toBe(403);
  });
});
