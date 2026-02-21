import { test, expect } from '@playwright/test';
import {
  fillInput,
  mockAuditScanAPI,
  mockAuditStatusAPI,
  waitForHydration,
} from './fixtures/base.fixture';
import {
  MOCK_SCAN_ID,
  makeScanCreatedResponse,
  makeScanCachedResponse,
  makeStatusPending,
  makeStatusRunning,
  makeStatusCompleted,
  makeStatusFailed,
} from './fixtures/audit-mock-data';
import { VALID_AUDIT_URL } from './fixtures/test-data';

const AUDIT_URL = '/audit';

// ---------------------------------------------------------------------------
// Static rendering
// ---------------------------------------------------------------------------

test.describe('audit scan page - static rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUDIT_URL);
    await page.waitForLoadState('load');
  });

  test('renders hero heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /free website performance audit/i })
    ).toBeVisible();
  });

  test('renders URL input with aria-label', async ({ page }) => {
    const input = page.getByLabel('Website URL');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('type', 'url');
  });

  test('renders submit button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: 'Audit this site' })
    ).toBeVisible();
  });

  test('renders How It Works section with 3 steps', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'How It Works' })
    ).toBeVisible();

    // HowItWorks has 3 steps rendered as <li> inside an <ol>
    await expect(
      page.locator('section[aria-labelledby="how-it-works-heading"] li')
    ).toHaveCount(3);

    // Verify step headings exist
    await expect(
      page.getByRole('heading', { name: 'Paste your URL' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Get your report' })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Fix what matters' })
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Form validation
// ---------------------------------------------------------------------------

test.describe('audit scan page - form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUDIT_URL);
    await waitForHydration(page);
  });

  test('empty URL shows validation error', async ({ page }) => {
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(page.getByText('Please enter a URL.')).toBeVisible();
  });

  test('invalid URL shows validation error', async ({ page }) => {
    await fillInput(page.getByLabel('Website URL'), 'no-tld');
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(
      page.getByText('Please enter a valid URL (e.g. example.com).')
    ).toBeVisible();
  });

  test('blur on invalid input shows validation error', async ({ page }) => {
    const input = page.getByLabel('Website URL');
    await fillInput(input, 'no-tld');
    await input.blur();

    await expect(
      page.getByText('Please enter a valid URL (e.g. example.com).')
    ).toBeVisible();
  });

  test('typing clears validation error', async ({ page }) => {
    const input = page.getByLabel('Website URL');

    // Trigger an error first
    await page.getByRole('button', { name: 'Audit this site' }).click();
    await expect(page.getByText('Please enter a URL.')).toBeVisible();

    // Typing should clear it
    await fillInput(input, 'e');
    await expect(page.getByText('Please enter a URL.')).toBeHidden();
  });

  test('input and button disabled while submitting', async ({ page }) => {
    // Route handler must return a never-resolving promise to keep the
    // request (and therefore the submitting state) pending indefinitely.
    // An async handler that returns without calling fulfill/continue/abort
    // may be auto-aborted by Playwright, racing the assertion.
    await page.route('**/api/audit/scan', () => new Promise(() => {}));

    const input = page.getByLabel('Website URL');
    const button = page.getByRole('button', {
      name: /audit this site|starting scan/i,
    });

    await fillInput(input, VALID_AUDIT_URL);
    await button.click();

    await expect(input).toBeDisabled();
    await expect(
      page.getByRole('button', { name: /starting scan/i })
    ).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Successful scan flow
// ---------------------------------------------------------------------------

test.describe('audit scan page - successful scan flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUDIT_URL);
    await waitForHydration(page);
  });

  test('shows ScanProgress after submitting URL', async ({ page }) => {
    await mockAuditScanAPI(page, 200, makeScanCreatedResponse());
    // Mock status to keep returning pending so we stay on the progress view
    await mockAuditStatusAPI(page, [
      { status: 200, body: makeStatusPending() },
    ]);

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    // ScanProgress should appear with progress bar
    await expect(
      page.getByRole('progressbar', { name: 'Scan progress' })
    ).toBeVisible();
  });

  test('shows "Scanning" text during polling', async ({ page }) => {
    await mockAuditScanAPI(page, 200, makeScanCreatedResponse());
    await mockAuditStatusAPI(page, [
      { status: 200, body: makeStatusPending() },
    ]);

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(page.getByText(`Scanning ${VALID_AUDIT_URL}`)).toBeVisible();
  });

  test('polls pending then completed, redirects to report', async ({
    page,
  }) => {
    await mockAuditScanAPI(page, 200, makeScanCreatedResponse());
    await mockAuditStatusAPI(page, [
      { status: 200, body: makeStatusPending() },
      { status: 200, body: makeStatusRunning() },
      { status: 200, body: makeStatusCompleted() },
    ]);

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    // Should redirect to the report page
    await page.waitForURL(`**/audit/r/${MOCK_SCAN_ID}`, { timeout: 15000 });
    expect(page.url()).toContain(`/audit/r/${MOCK_SCAN_ID}`);
  });

  test('cached scan redirects immediately', async ({ page }) => {
    await mockAuditScanAPI(page, 200, makeScanCachedResponse());

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await page.waitForURL(`**/audit/r/${MOCK_SCAN_ID}`, { timeout: 15000 });
    expect(page.url()).toContain(`/audit/r/${MOCK_SCAN_ID}`);
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

test.describe('audit scan page - error handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUDIT_URL);
    await waitForHydration(page);
  });

  test('scan API 500 shows generic error', async ({ page }) => {
    // Empty body so client falls back to "Something went wrong..." message
    await mockAuditScanAPI(page, 500, {});

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(
      page.getByText('Something went wrong. Please try again.')
    ).toBeVisible();
  });

  test('scan API 429 shows rate limit error', async ({ page }) => {
    await mockAuditScanAPI(page, 429, {
      error: 'Rate limit exceeded. Please try again later.',
    });

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(
      page.getByText('Too many scans. Please try again in an hour.')
    ).toBeVisible();
  });

  test('scan API 400 shows server error message', async ({ page }) => {
    await mockAuditScanAPI(page, 400, { error: 'Invalid or disallowed URL' });

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(page.getByText('Invalid or disallowed URL')).toBeVisible();
  });

  test('status poll 500 shows status error', async ({ page }) => {
    await mockAuditScanAPI(page, 200, makeScanCreatedResponse());
    await mockAuditStatusAPI(page, [
      { status: 500, body: { error: 'Internal server error' } },
    ]);

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(page.getByText('Failed to check scan status.')).toBeVisible({
      timeout: 10000,
    });
  });

  test('status returns failed shows error_message', async ({ page }) => {
    await mockAuditScanAPI(page, 200, makeScanCreatedResponse());
    await mockAuditStatusAPI(page, [
      {
        status: 200,
        body: makeStatusFailed(MOCK_SCAN_ID, 'Page returned 404'),
      },
    ]);

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(page.getByText('Page returned 404')).toBeVisible({
      timeout: 10000,
    });
  });

  test('network error shows network error message', async ({ page }) => {
    await page.route('**/api/audit/scan', route => route.abort());

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(
      page.getByText('Network error. Please try again.')
    ).toBeVisible();
  });

  test('"Try again" button resets form to idle', async ({ page }) => {
    await mockAuditScanAPI(page, 500, {});

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    // Wait for error to appear
    await expect(
      page.getByText('Something went wrong. Please try again.')
    ).toBeVisible();

    // Click "Try again"
    await page.getByRole('button', { name: 'Try again' }).click();

    // Form should be back to idle state
    await expect(
      page.getByRole('button', { name: 'Audit this site' })
    ).toBeVisible();
    await expect(
      page.getByText('Something went wrong. Please try again.')
    ).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test.describe('audit scan page - accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(AUDIT_URL);
    await page.waitForLoadState('load');
  });

  test('uRL input has aria-label', async ({ page }) => {
    await expect(page.getByLabel('Website URL')).toHaveAttribute(
      'aria-label',
      'Website URL'
    );
  });

  test('button text changes to "Starting scan..." while submitting', async ({
    page,
  }) => {
    await waitForHydration(page);

    // Hang the request to keep submitting state
    await page.route('**/api/audit/scan', async () => undefined);

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(
      page.getByRole('button', { name: /starting scan/i })
    ).toBeVisible();
  });

  test('progress steps use list with aria-label', async ({ page }) => {
    await waitForHydration(page);

    await mockAuditScanAPI(page, 200, makeScanCreatedResponse());
    await mockAuditStatusAPI(page, [
      { status: 200, body: makeStatusPending() },
    ]);

    await fillInput(page.getByLabel('Website URL'), VALID_AUDIT_URL);
    await page.getByRole('button', { name: 'Audit this site' }).click();

    await expect(page.getByRole('list', { name: 'Scan steps' })).toBeVisible();
  });
});
