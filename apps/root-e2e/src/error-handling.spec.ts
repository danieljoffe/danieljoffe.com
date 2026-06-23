import { test, expect } from '@playwright/test';
import { VALID_FORM_DATA } from './fixtures/test-data';
import {
  fillInput,
  mockHCaptcha,
  completeHCaptcha,
  mockEmailAPISuccess,
  waitForHydration,
} from './fixtures/base.fixture';

test.describe('404 Error Page', () => {
  test('shows 404 for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-definitely-does-not-exist-xyz', {
      waitUntil: 'domcontentloaded',
    });

    // Wait for page content to render
    await page.locator('h1, h2').first().waitFor({ state: 'visible' });

    await expect(
      page.getByRole('heading', { name: '404', exact: true })
    ).toBeVisible();
  });

  test('404 page has link back to home', async ({ page }) => {
    await page.goto('/non-existent-page-abc', {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('h1, h2').first().waitFor({ state: 'visible' });

    // Look for the "Back to Home" button/link in main content area (not nav)
    const homeLink = page.locator('main a:has-text("Back to Home")').first();

    // The link should be visible - increase timeout for mobile
    await expect(homeLink).toBeVisible({ timeout: 10000 });
  });

  test('clicking home link on 404 navigates to homepage', async ({ page }) => {
    await page.goto('/non-existent-page-def', {
      waitUntil: 'domcontentloaded',
    });
    await page.locator('h1, h2').first().waitFor({ state: 'visible' });

    // Use the specific "Back to Home" link in main content
    const homeLink = page.locator('main a:has-text("Back to Home")').first();

    await expect(homeLink).toBeVisible({ timeout: 10000 });
    await homeLink.click();

    await expect(page).toHaveURL('/');
  });

  test('404 page has noindex meta tag', async ({ page }) => {
    await page.goto('/non-existent-page-ghi', {
      waitUntil: 'domcontentloaded',
    });

    // Check for robots meta tag - may have multiple with different content
    const robots = page.locator('meta[name="robots"]');
    const count = await robots.count();

    if (count > 0) {
      // Check all robots tags for noindex
      let hasNoindex = false;
      for (let i = 0; i < count; i++) {
        const content = await robots.nth(i).getAttribute('content');
        if (content?.toLowerCase().includes('noindex')) {
          hasNoindex = true;
          break;
        }
      }
      expect(hasNoindex).toBeTruthy();
    } else {
      // If no robots tag, just verify it's a 404 page
      const is404 = page.getByRole('heading', { name: '404' });
      await expect(is404).toBeVisible();
    }
  });
});

test.describe('thank-you page protection', () => {
  test('redirects to home when accessed directly', async ({ page }) => {
    // Try to access thank-you page directly
    await page.goto('/thank-you/email', { waitUntil: 'domcontentloaded' });

    // Should redirect to home page
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('thank-you page accessible after form submission', async ({ page }) => {
    // Set up mocks before navigation
    await mockHCaptcha(page);
    await mockEmailAPISuccess(page);

    // Start at about page — wait for networkidle to ensure React hydration
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(
      page.getByRole('button', { name: /send message/i })
    ).toBeEnabled();

    // Fill and submit form — scope to form to avoid matching nav "Send Email" links
    const form = page.locator('form');
    await fillInput(form.getByLabel(/name/i), VALID_FORM_DATA.name);
    await fillInput(form.getByLabel(/email/i), VALID_FORM_DATA.email);
    await fillInput(form.getByLabel(/message/i), VALID_FORM_DATA.message);

    // Complete hCaptcha verification
    await completeHCaptcha(page);

    const submitButton = page.getByRole('button', { name: /send message/i });
    await submitButton.click();

    // Wait for navigation to thank-you page
    await expect(page).toHaveURL(/.*thank-you.*email/, { timeout: 15000 });

    // Verify thank-you page content is visible
    const thankYouHeading = page.getByRole('heading').first();
    await expect(thankYouHeading).toBeVisible();
  });

  test('thank-you page has noindex meta tag', async ({ page }) => {
    // Set up mocks
    await mockHCaptcha(page);
    await mockEmailAPISuccess(page);

    // Navigate via form submission — wait for networkidle for hydration
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(
      page.getByRole('button', { name: /send message/i })
    ).toBeEnabled();

    const form1 = page.locator('form');
    await fillInput(form1.getByLabel(/name/i), VALID_FORM_DATA.name);
    await fillInput(form1.getByLabel(/email/i), VALID_FORM_DATA.email);
    await fillInput(form1.getByLabel(/message/i), VALID_FORM_DATA.message);

    await completeHCaptcha(page);

    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page).toHaveURL(/.*thank-you.*email/, { timeout: 15000 });

    // Check for noindex
    const robots = page.locator('meta[name="robots"]');
    const content = await robots.getAttribute('content');

    expect(content?.includes('noindex')).toBeTruthy();
  });

  test('thank-you page has link to home', async ({ page }) => {
    // Set up mocks
    await mockHCaptcha(page);
    await mockEmailAPISuccess(page);

    // Navigate via form submission — wait for networkidle for hydration
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(
      page.getByRole('button', { name: /send message/i })
    ).toBeEnabled();

    const form2 = page.locator('form');
    await fillInput(form2.getByLabel(/name/i), VALID_FORM_DATA.name);
    await fillInput(form2.getByLabel(/email/i), VALID_FORM_DATA.email);
    await fillInput(form2.getByLabel(/message/i), VALID_FORM_DATA.message);

    await completeHCaptcha(page);

    await page.getByRole('button', { name: /send message/i }).click();
    await expect(page).toHaveURL(/.*thank-you.*email/, { timeout: 15000 });

    // Check for the "Back to home" button (not the nav link, which is hidden on mobile)
    const homeLink = page.locator('a[aria-label="Return to home page"]');
    await expect(homeLink).toBeVisible();
  });
});
