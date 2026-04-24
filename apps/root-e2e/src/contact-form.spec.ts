import { test, expect } from '@playwright/test';
import { VALID_FORM_DATA, INVALID_FORM_DATA } from './fixtures/test-data';
import {
  fillInput,
  mockHCaptcha,
  completeHCaptcha,
  mockEmailAPISuccess,
  mockEmailAPIError,
  waitForHydration,
} from './fixtures/base.fixture';

test.describe('contact form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    // Wait for React hydration to complete before interacting with the form.
    // Without this, webkit may show the form HTML before event handlers
    // are attached, causing submit clicks to trigger native form submission
    // instead of React's handleSubmit (no validation errors appear).
    await waitForHydration(page);
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.getByRole('button', { name: /submit/i })).toBeEnabled();
  });

  test('form is visible on about page', async ({ page }) => {
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });

  test('shows validation error for empty name field', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Wait for validation to trigger and re-render
    const errorOrInvalid = page.locator(
      'input[name="name"][aria-invalid="true"], [role="alert"]'
    );
    await expect(errorOrInvalid.first()).toBeAttached({ timeout: 5000 });
  });

  test('shows validation error for short name on submit', async ({ page }) => {
    const nameInput = page.locator('form').getByLabel(/name/i);
    await fillInput(nameInput, INVALID_FORM_DATA.shortName);

    // Fill other fields to trigger name validation on submit
    await fillInput(
      page.locator('form').getByLabel(/email/i),
      VALID_FORM_DATA.email
    );
    await fillInput(
      page.locator('form').getByLabel(/message/i),
      VALID_FORM_DATA.message
    );

    // Submit form to trigger validation
    const submitButton = page.getByRole('button', { name: /submit/i });
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
    await fillInput(
      page.locator('form').getByLabel(/name/i),
      VALID_FORM_DATA.name
    );
    await fillInput(
      page.locator('form').getByLabel(/message/i),
      VALID_FORM_DATA.message
    );

    const emailInput = page.locator('form').getByLabel(/email/i);
    await fillInput(emailInput, INVALID_FORM_DATA.invalidEmail);

    // Submit form to trigger validation
    const submitButton = page.getByRole('button', { name: /submit/i });
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
    await fillInput(
      page.locator('form').getByLabel(/name/i),
      VALID_FORM_DATA.name
    );
    await fillInput(
      page.locator('form').getByLabel(/email/i),
      VALID_FORM_DATA.email
    );

    const messageInput = page.locator('form').getByLabel(/message/i);
    await fillInput(messageInput, INVALID_FORM_DATA.shortMessage);

    // Submit form to trigger validation
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Wait for validation error to appear
    await expect(messageInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('shows validation error for message with URL on submit', async ({
    page,
  }) => {
    // Fill valid name and email first
    await fillInput(
      page.locator('form').getByLabel(/name/i),
      VALID_FORM_DATA.name
    );
    await fillInput(
      page.locator('form').getByLabel(/email/i),
      VALID_FORM_DATA.email
    );

    // Fill message with URL
    const messageInput = page.locator('form').getByLabel(/message/i);
    await fillInput(messageInput, INVALID_FORM_DATA.messageWithUrl);

    // Submit form to trigger validation
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Wait for validation error to appear
    await expect(messageInput).toHaveAttribute('aria-invalid', 'true');
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
    const nameInput = page.locator('form').getByLabel(/name/i);
    const emailInput = page.locator('form').getByLabel(/email/i);
    const messageInput = page.locator('form').getByLabel(/message/i);

    await expect(nameInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(messageInput).toHaveAttribute('required', '');
  });
});

test.describe('contact form submission', () => {
  test('successful submission redirects to thank-you page', async ({
    page,
  }) => {
    // Set up mocks before navigation
    await mockHCaptcha(page);
    await mockEmailAPISuccess(page);

    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.getByRole('button', { name: /submit/i })).toBeEnabled();

    // Fill form with valid data
    await fillInput(
      page.locator('form').getByLabel(/name/i),
      VALID_FORM_DATA.name
    );
    await fillInput(
      page.locator('form').getByLabel(/email/i),
      VALID_FORM_DATA.email
    );
    await fillInput(
      page.locator('form').getByLabel(/message/i),
      VALID_FORM_DATA.message
    );

    // Complete hCaptcha verification
    await completeHCaptcha(page);

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Wait for navigation to thank-you page
    await expect(page).toHaveURL(/.*thank-you.*email/, { timeout: 15000 });
  });

  test('shows error alert on API failure', async ({ page }) => {
    // Set up mocks
    await mockHCaptcha(page);
    await mockEmailAPIError(page);

    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.getByRole('button', { name: /submit/i })).toBeEnabled();

    // Fill form with valid data
    await fillInput(
      page.locator('form').getByLabel(/name/i),
      VALID_FORM_DATA.name
    );
    await fillInput(
      page.locator('form').getByLabel(/email/i),
      VALID_FORM_DATA.email
    );
    await fillInput(
      page.locator('form').getByLabel(/message/i),
      VALID_FORM_DATA.message
    );

    // Complete hCaptcha verification
    await completeHCaptcha(page);

    // Submit form
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Wait for error alert
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  // The "no captcha token" path is racy in E2E: the mocked render() fires the
  // verify callback on mount, and clicking submit auto-scrolls the captcha
  // into view, so the token is populated before the submit handler runs.
  // The same error-alert surface is covered by the "shows error alert on API
  // failure" test above; the missing-token branch is exercised in unit tests
  // against react-hook-form's handler.
  test.skip('shows captcha error when submitting without captcha', async ({
    page,
  }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
    await page.locator('form').waitFor({ state: 'visible' });
    await expect(page.getByRole('button', { name: /submit/i })).toBeEnabled();

    // Fill form with valid data
    await fillInput(
      page.locator('form').getByLabel(/name/i),
      VALID_FORM_DATA.name
    );
    await fillInput(
      page.locator('form').getByLabel(/email/i),
      VALID_FORM_DATA.email
    );
    await fillInput(
      page.locator('form').getByLabel(/message/i),
      VALID_FORM_DATA.message
    );

    // Scroll to make captcha visible and wait for it to load
    const form = page.locator('form');
    await form.scrollIntoViewIfNeeded();

    // Wait for the submit button to be ready
    await expect(page.getByRole('button', { name: /submit/i })).toBeEnabled();

    // Submit form without completing captcha
    const submitButton = page.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Should show captcha error - wait for it to appear using auto-waiting
    const errorAlert = page.getByRole('alert');
    await expect(errorAlert).toBeVisible({ timeout: 5000 });
  });

  test('submit button is initially enabled', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.locator('form').waitFor({ state: 'visible' });

    const submitButton = page.getByRole('button', { name: /submit/i });
    await expect(submitButton).toBeEnabled();
  });
});
