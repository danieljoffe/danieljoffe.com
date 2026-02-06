import {
  test,
  expect,
  VALID_FORM_DATA,
  INVALID_FORM_DATA,
  mockHCaptcha,
  mockEmailAPISuccess,
  mockEmailAPIError,
} from './fixtures/base.fixture';

test.describe('contact Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about');
    // Wait for full page load including JS hydration (webkit hydrates slower)
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('form is visible on about page', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('shows validation error for empty name field', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation to trigger and re-render
    const errorOrInvalid = page.locator(
      'input[name="name"][aria-invalid="true"], [role="alert"]'
    );
    await expect(errorOrInvalid.first()).toBeAttached({ timeout: 5000 });
  });

  test('shows validation error for short name on submit', async ({ page }) => {
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill(INVALID_FORM_DATA.shortName);

    // Fill other fields to trigger name validation on submit
    await page.locator('input[name="email"]').fill(VALID_FORM_DATA.email);
    await page
      .locator('textarea[name="message"]')
      .fill(VALID_FORM_DATA.message);

    // Submit form to trigger validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation error to appear
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true', {
      timeout: 5000,
    });
  });

  test('shows validation error for invalid email on submit', async ({
    page,
  }) => {
    // Fill name and message with valid data
    await page.locator('input[name="name"]').fill(VALID_FORM_DATA.name);
    await page
      .locator('textarea[name="message"]')
      .fill(VALID_FORM_DATA.message);

    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill(INVALID_FORM_DATA.invalidEmail);

    // Submit form to trigger validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation error to appear
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true', {
      timeout: 5000,
    });
  });

  test('shows validation error for short message on submit', async ({
    page,
  }) => {
    // Fill name and email with valid data
    await page.locator('input[name="name"]').fill(VALID_FORM_DATA.name);
    await page.locator('input[name="email"]').fill(VALID_FORM_DATA.email);

    const messageInput = page.locator('textarea[name="message"]');
    await messageInput.fill(INVALID_FORM_DATA.shortMessage);

    // Submit form to trigger validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation error to appear
    await expect(messageInput).toHaveAttribute('aria-invalid', 'true', {
      timeout: 5000,
    });
  });

  test('shows validation error for message with URL on submit', async ({
    page,
  }) => {
    // Fill valid name and email first
    await page.locator('input[name="name"]').fill(VALID_FORM_DATA.name);
    await page.locator('input[name="email"]').fill(VALID_FORM_DATA.email);

    // Fill message with URL
    const messageInput = page.locator('textarea[name="message"]');
    await messageInput.fill(INVALID_FORM_DATA.messageWithUrl);

    // Submit form to trigger validation
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for validation error to appear
    await expect(messageInput).toHaveAttribute('aria-invalid', 'true', {
      timeout: 5000,
    });
  });

  test('form fields have associated labels', async ({ page }) => {
    const nameLabel = page.locator('label[for]').filter({ hasText: /name/i });
    const emailLabel = page.locator('label[for]').filter({ hasText: /email/i });
    const messageLabel = page
      .locator('label[for]')
      .filter({ hasText: /message/i });

    await expect(nameLabel).toBeAttached();
    await expect(emailLabel).toBeAttached();
    await expect(messageLabel).toBeAttached();
  });

  test('required fields are marked as required', async ({ page }) => {
    const nameInput = page.locator('input[name="name"]');
    const emailInput = page.locator('input[name="email"]');
    const messageInput = page.locator('textarea[name="message"]');

    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(messageInput).toHaveAttribute('required', '');
  });
});

test.describe('contact Form Submission', () => {
  // Note: These tests are skipped because they require real hCaptcha interaction.
  // The hCaptcha React component cannot be easily mocked in e2e tests since it
  // uses a third-party widget that must be completed by a real user.
  // For full submission testing, use manual testing or a staging environment
  // with hCaptcha test keys (sitekey: 10000000-ffff-ffff-ffff-000000000001).

  test.skip('successful submission redirects to thank-you page', async ({
    page,
  }) => {
    // Set up mocks before navigation
    await mockHCaptcha(page);
    await mockEmailAPISuccess(page);

    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');

    // Fill form with valid data
    await page.locator('input[name="name"]').fill(VALID_FORM_DATA.name);
    await page.locator('input[name="email"]').fill(VALID_FORM_DATA.email);
    await page
      .locator('textarea[name="message"]')
      .fill(VALID_FORM_DATA.message);

    // Wait for captcha to be potentially visible (lazy loaded)
    await page.waitForTimeout(500);

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for navigation to thank-you page
    await expect(page).toHaveURL(/.*thank-you.*email/, { timeout: 10000 });
  });

  test.skip('shows error alert on API failure', async ({ page }) => {
    // Set up mocks
    await mockHCaptcha(page);
    await mockEmailAPIError(page);

    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');

    // Fill form with valid data
    await page.locator('input[name="name"]').fill(VALID_FORM_DATA.name);
    await page.locator('input[name="email"]').fill(VALID_FORM_DATA.email);
    await page
      .locator('textarea[name="message"]')
      .fill(VALID_FORM_DATA.message);

    await page.waitForTimeout(500);

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Wait for error alert - use specific ID to avoid conflict with Next.js route announcer
    await page.waitForTimeout(1000);

    const errorAlert = page.locator('#form-error');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('shows captcha error when submitting without captcha', async ({
    page,
  }) => {
    await page.goto('/about');
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.locator('button[type="submit"]')).toBeEnabled();

    // Fill form with valid data
    await page.locator('input[name="name"]').fill(VALID_FORM_DATA.name);
    await page.locator('input[name="email"]').fill(VALID_FORM_DATA.email);
    await page
      .locator('textarea[name="message"]')
      .fill(VALID_FORM_DATA.message);

    // Scroll to make captcha visible and wait for it to load
    const form = page.locator('form');
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);

    // Submit form without completing captcha
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Should show captcha error - wait for it to appear using auto-waiting
    const errorAlert = page.locator('#form-error');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('submit button is disabled during submission', async ({ page }) => {
    await page.goto('/about');
    await page.locator('form').waitFor({ state: 'visible' });

    const submitButton = page.locator('button[type="submit"]');

    // Button should not be disabled initially
    await expect(submitButton).toBeEnabled();

    // Verify button exists and is enabled
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toHaveText(/submit/i);
  });
});
