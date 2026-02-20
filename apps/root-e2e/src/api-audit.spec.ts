import { test, expect } from '@playwright/test';

// Each test invocation gets a globally unique IP to avoid rate limit
// interference when multiple browser projects run in parallel.
let _ipCounter = 0;
function headersWithUniqueIP() {
  return {
    'Content-Type': 'application/json',
    'x-forwarded-for': `10.${process.pid}.${++_ipCounter}.${Date.now()}`,
  };
}

// Tests that query Supabase (nonexistent UUID lookups, rate limiting) require
// the database to be configured. Pure validation tests (invalid UUID format,
// missing fields) return 400 before touching Supabase.
const HAS_SUPABASE = !!process.env['NEXT_PUBLIC_SUPABASE_URL'];

// ---------------------------------------------------------------------------
// POST /api/audit/scan — validation
// ---------------------------------------------------------------------------

test.describe('api audit scan - validation', () => {
  test('rejects missing body', async ({ request }) => {
    const response = await request.post('/api/audit/scan', {
      headers: headersWithUniqueIP(),
      data: {},
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('URL is required');
  });

  test('rejects empty URL', async ({ request }) => {
    const response = await request.post('/api/audit/scan', {
      headers: headersWithUniqueIP(),
      data: { url: '' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('URL is required');
  });

  test('rejects non-string URL', async ({ request }) => {
    const response = await request.post('/api/audit/scan', {
      headers: headersWithUniqueIP(),
      data: { url: 12345 },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('URL is required');
  });

  test('rejects localhost URL', async ({ request }) => {
    const response = await request.post('/api/audit/scan', {
      headers: headersWithUniqueIP(),
      data: { url: 'http://localhost:3000' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid or disallowed URL');
  });

  test('rejects private IP 192.168.x.x', async ({ request }) => {
    const response = await request.post('/api/audit/scan', {
      headers: headersWithUniqueIP(),
      data: { url: 'http://192.168.1.1' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid or disallowed URL');
  });

  test('rejects private IP 10.x.x.x', async ({ request }) => {
    const response = await request.post('/api/audit/scan', {
      headers: headersWithUniqueIP(),
      data: { url: 'http://10.0.0.1' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid or disallowed URL');
  });

  test('rejects URL without TLD', async ({ request }) => {
    const response = await request.post('/api/audit/scan', {
      headers: headersWithUniqueIP(),
      data: { url: 'http://no-tld' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid or disallowed URL');
  });
});

// ---------------------------------------------------------------------------
// POST /api/audit/scan — rate limiting (requires Supabase)
// ---------------------------------------------------------------------------

if (HAS_SUPABASE) {
  test.describe('api audit scan - rate limiting', () => {
    test('allows 5 requests from same IP', async ({ request }) => {
      const uniqueIP = `rate-limit-scan-${Date.now()}`;
      const headers = {
        'Content-Type': 'application/json',
        'x-forwarded-for': uniqueIP,
      };

      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        const response = await request.post('/api/audit/scan', {
          headers,
          data: { url: `https://example-${Date.now()}-${i}.com` },
        });
        statuses.push(response.status());
      }

      // None of the first 5 should be 429
      expect(statuses.every(s => s !== 429)).toBe(true);
    });

    test('blocks 6th request with 429', async ({ request }) => {
      const uniqueIP = `rate-limit-scan-block-${Date.now()}`;
      const headers = {
        'Content-Type': 'application/json',
        'x-forwarded-for': uniqueIP,
      };

      for (let i = 0; i < 5; i++) {
        await request.post('/api/audit/scan', {
          headers,
          data: { url: `https://example-${Date.now()}-${i}.com` },
        });
      }

      const response = await request.post('/api/audit/scan', {
        headers,
        data: { url: `https://example-${Date.now()}-sixth.com` },
      });

      expect(response.status()).toBe(429);
      const body = await response.json();
      expect(body.error).toContain('Rate limit');
    });
  });
}

// ---------------------------------------------------------------------------
// GET /api/audit/status/[id] — validation
// ---------------------------------------------------------------------------

test.describe('api audit status - validation', () => {
  test('rejects invalid UUID format', async ({ request }) => {
    const response = await request.get('/api/audit/status/not-a-uuid');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid scan ID');
  });
});

if (HAS_SUPABASE) {
  test.describe('api audit status - not found', () => {
    test('returns 404 for nonexistent UUID', async ({ request }) => {
      const response = await request.get(
        '/api/audit/status/00000000-0000-0000-0000-000000000000'
      );

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Scan not found');
    });
  });
}

// ---------------------------------------------------------------------------
// GET /api/audit/report/[id] — validation
// ---------------------------------------------------------------------------

test.describe('api audit report - validation', () => {
  test('rejects invalid UUID format', async ({ request }) => {
    const response = await request.get('/api/audit/report/not-a-uuid');

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid scan ID');
  });
});

if (HAS_SUPABASE) {
  test.describe('api audit report - not found', () => {
    test('returns 404 for nonexistent UUID', async ({ request }) => {
      const response = await request.get(
        '/api/audit/report/00000000-0000-0000-0000-000000000000'
      );

      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Report not found');
    });
  });
}

// ---------------------------------------------------------------------------
// POST /api/leads/capture — validation
// ---------------------------------------------------------------------------

test.describe('api leads capture - validation', () => {
  test('rejects missing email', async ({ request }) => {
    const response = await request.post('/api/leads/capture', {
      headers: { 'Content-Type': 'application/json' },
      data: { scan_id: '00000000-0000-0000-0000-000000000000' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Valid email is required');
  });

  test('rejects invalid email format', async ({ request }) => {
    const response = await request.post('/api/leads/capture', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: 'not-an-email',
        scan_id: '00000000-0000-0000-0000-000000000000',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Valid email is required');
  });

  test('rejects invalid scan_id format', async ({ request }) => {
    const response = await request.post('/api/leads/capture', {
      headers: { 'Content-Type': 'application/json' },
      data: { email: 'test@example.com', scan_id: 'not-a-uuid' },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid scan ID');
  });
});
