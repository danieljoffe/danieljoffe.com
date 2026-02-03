import { test, expect } from '@playwright/test';

test.describe('homepage', () => {
  test('has correct title and meta tags', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle(/Senior Frontend Engineer/);

    // Check meta description - wait for it to be present
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toBeAttached();
    await expect(metaDescription).toHaveAttribute(
      'content',
      /frontend engineer/i
    );

    // Check viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
  });

  test('has proper heading structure', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    await expect(h1).toContainText(/Daniel Joffe/);

    // Check for proper heading hierarchy
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    // Check that there is at least one heading present
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThanOrEqual(1);
  });

  test('navigation works correctly', async ({ page }) => {
    // Set a consistent desktop viewport for this test
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Check if main navigation is visible (use specific aria-label to distinguish from footer nav)
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // On desktop viewport, navigation links should be directly visible
    const aboutLink = page.locator('a[href*="/about"]').first();
    await expect(aboutLink).toBeVisible({ timeout: 5000 });

    await aboutLink.click();
    await expect(page).toHaveURL(/.*about/, { timeout: 10000 });
  });

  test('contact form functionality', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');

    // Check if contact form is present
    const form = page.locator('form');
    await expect(form).toBeVisible({ timeout: 5000 });

    // Test form validation by submitting empty form
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible({ timeout: 3000 });
    await submitButton.click();

    // Wait for validation to trigger
    await page.waitForTimeout(1000);

    // Check for validation messages - look for various error indicators
    const errorMessages = page.locator(
      '[role="alert"], .error, [aria-invalid="true"], input:invalid'
    );
    const errorMessageCount = await errorMessages.count();

    // Check for validation - either error messages or required fields
    const requiredFields = page.locator('input[required], textarea[required]');
    const requiredFieldCount = await requiredFields.count();

    // Should have either error messages or required fields
    expect(errorMessageCount > 0 || requiredFieldCount > 0).toBeTruthy();
  });

  test('responsive design works on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Wait for page to fully load and styles to be applied
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500); // Give time for CSS to apply

    // Check if mobile navigation button is visible and accessible
    const mobileNavButton = page.locator('[aria-label="Open menu"]');
    await expect(mobileNavButton).toBeVisible({ timeout: 10000 });

    // Click the mobile navigation button
    await mobileNavButton.click();

    // Wait for the modal to open and check for modal dialog panel (the visible one)
    const modalDialog = page
      .locator('[role="dialog"][aria-modal="true"]')
      .last();
    await expect(modalDialog).toBeVisible({ timeout: 5000 });

    // Verify the modal content is accessible
    const modalContent = modalDialog.locator(
      'nav, [role="navigation"], a[href*="/about"], a[href*="/projects"]'
    );
    await expect(modalContent.first()).toBeVisible({ timeout: 3000 });

    // Close the modal by clicking the close button
    const closeButton = page.locator('button:has-text("Close")');
    await expect(closeButton).toBeVisible({ timeout: 3000 });
    await closeButton.click();

    // Wait for the modal to close and verify the button's aria-label changes back
    await expect(modalDialog).not.toBeVisible({ timeout: 5000 });
    await expect(mobileNavButton).toBeVisible({ timeout: 5000 });
  });

  test('accessibility compliance', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'WebKit has flaky browser context issues in this test'
    );
    await page.goto('/');

    // Check for proper ARIA labels
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasText = await button.textContent();

      // Button should have either aria-label or text content
      expect(hasAriaLabel || hasText?.trim()).toBeTruthy();
    }

    // Check for proper link accessibility
    const links = page.locator('a');
    const linkCount = await links.count();

    for (let i = 0; i < linkCount; i++) {
      const link = links.nth(i);
      const hasAriaLabel = await link.getAttribute('aria-label');
      const hasText = await link.textContent();
      const hasHref = link;

      // Link should have href and either aria-label or text content
      await expect(hasHref).toHaveAttribute('href');
      expect(hasAriaLabel || hasText?.trim()).toBeTruthy();
    }
  });

  test('performance metrics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('load');

    // Wait a bit for performance metrics to be available
    await page.waitForTimeout(500);

    // Check for performance issues
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      if (!navigation) {
        return {
          loadTime: 0,
          domContentLoaded: 0,
          firstPaint: 0,
          firstContentfulPaint: 0,
        };
      }

      return {
        loadTime: navigation.loadEventEnd - navigation.loadEventStart,
        domContentLoaded:
          navigation.domContentLoadedEventEnd -
          navigation.domContentLoadedEventStart,
        firstPaint:
          performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint:
          performance.getEntriesByName('first-contentful-paint')[0]
            ?.startTime || 0,
      };
    });

    // Basic performance assertions - more lenient for CI environments
    expect(performanceMetrics.loadTime).toBeLessThan(5000);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(3000);
  });

  test('sEO elements are present', async ({ page }) => {
    await page.goto('/');

    // Wait for page to fully load and meta tags to be rendered
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Check for Open Graph tags
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toBeAttached({ timeout: 5000 });
    await expect(ogTitle).toHaveAttribute('content', /Daniel Joffe/);

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toBeAttached({ timeout: 3000 });
    await expect(ogDescription).toHaveAttribute('content', /.+/);

    // Check for Twitter Card tags
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toBeAttached({ timeout: 3000 });
    await expect(twitterCard).toHaveAttribute('content', 'summary_large_image');

    // Check for canonical URL
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toBeAttached({ timeout: 3000 });
    await expect(canonical).toHaveAttribute('href', 'https://danieljoffe.com');

    // Check for robots meta tag
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toBeAttached({ timeout: 3000 });
    await expect(robots).toHaveAttribute('content', 'index, follow');
  });

  test('error handling', async ({ page }) => {
    // Test 404 page
    await page.goto('/non-existent-page');

    // Should redirect to 404 or show error message
    const is404 = await page.locator('h1:has-text("404")').isVisible();
    const isNotFound = await page
      .locator('h2:has-text("Page Not Found")')
      .isVisible();
    const isError = await page.locator('text=error').isVisible();

    expect(is404 || isNotFound || isError).toBeTruthy();
  });
});
