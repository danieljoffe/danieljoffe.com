import { test, expect } from '@playwright/test';
import {
  fillInput,
  mockLeadsCaptureAPI,
  waitForHydration,
} from './fixtures/base.fixture';
import {
  INVALID_UUID,
  NONEXISTENT_UUID,
  makeLeadCaptured,
  makeLeadAlreadyCaptured,
} from './fixtures/audit-mock-data';

// Supabase-dependent tests (nonexistent UUID lookup) need the database.
// Invalid UUID tests return 404 before touching Supabase.
const HAS_SUPABASE = !!process.env['NEXT_PUBLIC_SUPABASE_URL'];

// ---------------------------------------------------------------------------
// Not found states (server-rendered — no mocking needed)
// ---------------------------------------------------------------------------

test.describe('audit report - not found states', () => {
  test('invalid UUID shows 404', async ({ page }) => {
    await page.goto(`/audit/r/${INVALID_UUID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('load');

    await expect(
      page.getByRole('heading', { name: 'Report Not Found' })
    ).toBeVisible();
  });

  test('404 page has "Run a new audit" link', async ({ page }) => {
    await page.goto(`/audit/r/${INVALID_UUID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('load');

    const link = page.getByRole('link', { name: 'Run a new audit' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', '/audit');
  });

  test('"Run a new audit" navigates to /audit', async ({ page }) => {
    await page.goto(`/audit/r/${INVALID_UUID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('load');

    await page.getByRole('link', { name: 'Run a new audit' }).click();
    await page.waitForURL('**/audit');

    expect(page.url()).toContain('/audit');
    // Should not be on the report page
    expect(page.url()).not.toContain('/audit/r/');
  });
});

if (HAS_SUPABASE) {
  test.describe('audit report - not found (requires Supabase)', () => {
    test('nonexistent UUID shows 404', async ({ page }) => {
      await page.goto(`/audit/r/${NONEXISTENT_UUID}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('load');

      await expect(
        page.getByRole('heading', { name: 'Report Not Found' })
      ).toBeVisible();
    });
  });
}

// ---------------------------------------------------------------------------
// Email gate tests — requires AUDIT_E2E_SCAN_ID env var
// These run against a real completed report with >3 issues.
// The email gate form POSTs to /api/leads/capture (client-side = mockable).
// ---------------------------------------------------------------------------

const E2E_SCAN_ID = process.env['AUDIT_E2E_SCAN_ID'];

if (E2E_SCAN_ID) {
  test.describe('audit report - email gate', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/audit/r/${E2E_SCAN_ID}`, {
        waitUntil: 'domcontentloaded',
      });
      await waitForHydration(page);
    });

    test('blurred overlay shows "Unlock N more fixes"', async ({ page }) => {
      await expect(page.getByText(/unlock \d+ more fix/i)).toBeVisible();
    });

    test('empty email submit shows validation error', async ({ page }) => {
      await page.getByRole('button', { name: 'Get full report' }).click();

      await expect(
        page.getByText('Please enter a valid email address.')
      ).toBeVisible();
    });

    test('invalid email shows validation error', async ({ page }) => {
      await fillInput(page.getByLabel('Email address'), 'not-an-email');
      await page.getByRole('button', { name: 'Get full report' }).click();

      await expect(
        page.getByText('Please enter a valid email address.')
      ).toBeVisible();
    });

    test('successful lead capture unlocks gated issues', async ({ page }) => {
      await mockLeadsCaptureAPI(page, 200, makeLeadCaptured());

      await fillInput(page.getByLabel('Email address'), 'test@example.com');
      await page.getByRole('button', { name: 'Get full report' }).click();

      // The gate overlay should disappear and gated issues should be visible
      await expect(page.getByText(/unlock \d+ more fix/i)).toBeHidden();
    });

    test('already_captured response also unlocks gate', async ({ page }) => {
      await mockLeadsCaptureAPI(page, 200, makeLeadAlreadyCaptured());

      await fillInput(page.getByLabel('Email address'), 'test@example.com');
      await page.getByRole('button', { name: 'Get full report' }).click();

      await expect(page.getByText(/unlock \d+ more fix/i)).toBeHidden();
    });

    test('leads capture 500 shows error', async ({ page }) => {
      await mockLeadsCaptureAPI(page, 500, {
        error: 'Internal server error',
      });

      await fillInput(page.getByLabel('Email address'), 'test@example.com');
      await page.getByRole('button', { name: 'Get full report' }).click();

      await expect(
        page.getByText('Something went wrong. Please try again.')
      ).toBeVisible();
    });

    test('network error shows network error message', async ({ page }) => {
      await page.route('**/api/leads/capture', route => route.abort());

      const captureRequest = page.waitForRequest('**/api/leads/capture');
      await fillInput(page.getByLabel('Email address'), 'test@example.com');
      await page.getByRole('button', { name: 'Get full report' }).click();
      await captureRequest;

      await expect(
        page.getByText('Network error. Please try again.')
      ).toBeVisible();
    });

    test('"Try again" resets to locked state', async ({ page }) => {
      await mockLeadsCaptureAPI(page, 500, { error: 'Internal server error' });

      await fillInput(page.getByLabel('Email address'), 'test@example.com');
      await page.getByRole('button', { name: 'Get full report' }).click();

      // Wait for error
      await expect(
        page.getByText('Something went wrong. Please try again.')
      ).toBeVisible();

      // Click "Try again"
      await page.getByRole('button', { name: 'Try again' }).click();

      // Gate should be locked again with the form visible
      await expect(
        page.getByRole('button', { name: 'Get full report' })
      ).toBeVisible();
      await expect(
        page.getByText('Something went wrong. Please try again.')
      ).toBeHidden();
    });
  });
}

// ---------------------------------------------------------------------------
// Navigation & metadata
// ---------------------------------------------------------------------------

test.describe('audit report - navigation', () => {
  test('404 page has correct title', async ({ page }) => {
    await page.goto(`/audit/r/${INVALID_UUID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('load');

    await expect(page).toHaveTitle(/report not found/i);
  });
});

if (E2E_SCAN_ID) {
  test.describe('audit report - navigation (requires scan)', () => {
    test('valid report has correct title format', async ({ page }) => {
      await page.goto(`/audit/r/${E2E_SCAN_ID}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('load');

      await expect(page).toHaveTitle(/audit:.*grade.*daniel joffe/i);
    });

    test('cTA section has booking link', async ({ page }) => {
      await page.goto(`/audit/r/${E2E_SCAN_ID}`, {
        waitUntil: 'domcontentloaded',
      });
      await page.waitForLoadState('load');

      await expect(
        page.getByRole('heading', { name: 'Want these fixed?' })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Book a free discovery call' })
      ).toBeVisible();
    });
  });
}
