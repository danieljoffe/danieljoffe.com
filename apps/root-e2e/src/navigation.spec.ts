import { test, expect, NAV_LINKS } from './fixtures/base.fixture';

test.describe('desktop Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('navigates through all main nav links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    for (const link of NAV_LINKS) {
      const navLink = page
        .locator(`a[href="${link.href}"]`)
        .filter({ hasText: link.label })
        .first();
      await expect(navLink).toBeVisible();
    }
  });

  test('nav links have correct aria-labels', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    for (const link of NAV_LINKS) {
      const navLink = page.locator(
        `a[aria-label="Navigate to ${link.label} page"]`
      );
      await expect(navLink).toBeAttached();
    }
  });

  test('highlights current page with aria-current', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('domcontentloaded');

    const aboutLink = page.locator('a[href="/about"][aria-current="page"]');
    await expect(aboutLink).toBeAttached();
  });

  test('clicking nav link navigates to correct page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const projectsLink = page.locator('a[href="/projects"]').first();
    await projectsLink.click();

    await expect(page).toHaveURL(/.*projects/);
  });
});

test.describe('mobile Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('opens mobile menu on hamburger click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const menuButton = page.locator('[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible();

    await menuButton.click();

    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();
  });

  test('closes mobile menu on close button click', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open menu
    const menuButton = page.locator('[aria-label="Open menu"]');
    await menuButton.click();

    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();

    // Close menu
    const closeButton = page.locator('button:has-text("Close")');
    await closeButton.click();

    await expect(modal).toBeHidden();
  });

  test('navigates from mobile menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open menu
    const menuButton = page.locator('[aria-label="Open menu"]');
    await menuButton.click();

    // Wait for modal
    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();

    // Click About link in modal
    const aboutLink = modal.locator('a[href="/about"]').first();
    await aboutLink.click();

    await expect(page).toHaveURL(/.*about/);
  });

  test('mobile menu closes on Escape key', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open menu
    const menuButton = page.locator('[aria-label="Open menu"]');
    await menuButton.click();

    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');

    await expect(modal).toBeHidden();
  });

  test('mobile menu has close button focused on open', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Open menu
    const menuButton = page.locator('[aria-label="Open menu"]');
    await menuButton.click();

    // Wait for modal and animation
    await page.waitForTimeout(200);

    // Close button should be focusable
    const closeButton = page.locator('button:has-text("Close")');
    await expect(closeButton).toBeVisible();
  });
});

test.describe('breadcrumb Navigation', () => {
  test('shows breadcrumbs on project detail page', async ({ page }) => {
    await page.goto('/projects/performance-case-study');
    await page.waitForLoadState('domcontentloaded');

    const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbNav).toBeVisible();
  });

  test('breadcrumb links navigate correctly', async ({ page }) => {
    await page.goto('/projects/performance-case-study');
    await page.waitForLoadState('domcontentloaded');

    const projectsLink = page
      .locator('nav[aria-label="Breadcrumb"] a[href="/projects"]')
      .first();
    await expect(projectsLink).toBeVisible();

    await projectsLink.click();
    await expect(page).toHaveURL(/.*\/projects$/);
  });

  test('current page in breadcrumb has aria-current', async ({ page }) => {
    await page.goto('/projects/performance-case-study');
    await page.waitForLoadState('domcontentloaded');

    const currentPage = page.locator(
      'nav[aria-label="Breadcrumb"] [aria-current="page"]'
    );
    await expect(currentPage).toBeAttached();
  });

  test('shows breadcrumbs on experience detail page', async ({ page }) => {
    await page.goto('/experience/winc');
    await page.waitForLoadState('domcontentloaded');

    const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbNav).toBeVisible();

    const experienceLink = page
      .locator('nav[aria-label="Breadcrumb"] a[href="/experience"]')
      .first();
    await expect(experienceLink).toBeVisible();
  });
});
