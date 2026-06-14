import { test, expect } from '@playwright/test';

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
