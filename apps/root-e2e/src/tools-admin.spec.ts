import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

const ADMIN_PASSWORD = process.env['TOOLS_ADMIN_PASSWORD'];

test.describe('tools admin login', () => {
  test('redirects unauthenticated visitors from /tools/admin to /tools/login with next param', async ({
    page,
  }) => {
    await page.goto('/tools/admin', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/tools\/login\?next=/);
    expect(page.url()).toContain(`next=${encodeURIComponent('/tools/admin')}`);
    await expect(
      page.getByRole('heading', { name: /tools admin/i })
    ).toBeVisible();
  });

  test('redirects unauthenticated visitors from /tools/admin/audit to /tools/login with next param', async ({
    page,
  }) => {
    await page.goto('/tools/admin/audit', { waitUntil: 'domcontentloaded' });

    await expect(page).toHaveURL(/\/tools\/login\?next=/);
    expect(page.url()).toContain(
      `next=${encodeURIComponent('/tools/admin/audit')}`
    );
    await expect(
      page.getByRole('textbox', { name: /admin password/i })
    ).toBeVisible();
  });

  test('shows an error alert when the wrong password is submitted', async ({
    page,
  }) => {
    await page.goto('/tools/login?next=/tools/admin/audit', {
      waitUntil: 'domcontentloaded',
    });
    await waitForHydration(page);

    const passwordInput = page.getByRole('textbox', {
      name: /admin password/i,
    });
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill('definitely-not-the-password');

    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    const errorAlert = page.getByRole('alert');
    await expect(errorAlert.first()).toBeVisible({ timeout: 5000 });

    // Remains on the login page — no redirect occurred.
    await expect(page).toHaveURL(/\/tools\/login/);
  });

  test('signs in with the correct password and lands on the next path', async ({
    page,
  }) => {
    test.skip(
      !ADMIN_PASSWORD,
      'TOOLS_ADMIN_PASSWORD env var not set; skipping happy-path login test'
    );

    await page.goto('/tools/login?next=/tools/admin/audit', {
      waitUntil: 'domcontentloaded',
    });
    await waitForHydration(page);

    const passwordInput = page.getByRole('textbox', {
      name: /admin password/i,
    });
    await passwordInput.fill(ADMIN_PASSWORD as string);

    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    await expect(page).toHaveURL(/\/tools\/admin\/audit$/, { timeout: 15000 });
    await expect(
      page.getByRole('heading', { name: /audit admin/i })
    ).toBeVisible();
  });
});
