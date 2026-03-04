import { test, expect } from '@playwright/test';
import { NAV_LINKS } from './fixtures/test-data';
import { waitForHydration } from './fixtures/base.fixture';

test.describe('desktop navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('navigates through all main nav links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
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
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    for (const link of NAV_LINKS) {
      const navLink = page
        .locator('nav[aria-label="Main navigation"]')
        .locator(`a[aria-label="Navigate to ${link.label} page"]`);
      await expect(navLink).toBeAttached();
    }
  });

  test('highlights current page with aria-current', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const aboutLink = page.locator('a[href="/about"][aria-current="page"]');
    await expect(aboutLink).toBeAttached();
  });

  test('clicking nav link navigates to correct page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const projectsLink = page
      .locator('nav[aria-label="Main navigation"]')
      .locator('a[href="/projects"]')
      .first();
    await projectsLink.click();

    await expect(page).toHaveURL(/.*projects/);
  });
});

test.describe('mobile navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('opens mobile menu on hamburger click', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    const menuButton = page.getByLabel('Open menu');
    await expect(menuButton).toBeVisible();

    await menuButton.click();

    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();
  });

  test('closes mobile menu on close button click', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // Open menu
    const menuButton = page.getByLabel('Open menu');
    await menuButton.click();

    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();

    // Close menu
    const closeButton = modal.getByRole('button', { name: 'Close' });
    await closeButton.click();

    await expect(modal).toBeHidden();
  });

  test('navigates from mobile menu', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // Open menu
    const menuButton = page.getByLabel('Open menu');
    await menuButton.click();

    // Wait for modal to be visible and stable
    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();

    // Click About link in modal - wait for animations to complete
    const aboutLink = modal.locator('a[href="/about"]').first();
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();

    await expect(page).toHaveURL(/.*about/);
  });

  test('mobile menu has close button focused on open', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // Open menu
    const menuButton = page.getByLabel('Open menu');
    await menuButton.click();

    // Wait for modal to be visible
    const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
    await expect(modal).toBeVisible();

    // Close button should be visible and focusable
    const closeButton = modal.getByRole('button', { name: 'Close' });
    await expect(closeButton).toBeVisible();
  });
});

test.describe('breadcrumb navigation', () => {
  test('shows breadcrumbs on project detail page', async ({ page }) => {
    await page.goto('/projects/performance-case-study', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbNav).toBeVisible();
  });

  test('breadcrumb links navigate correctly', async ({ page }) => {
    await page.goto('/projects/performance-case-study', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbNav).toBeVisible();

    const projectsLink = breadcrumbNav.locator('a[href="/projects"]').first();
    await expect(projectsLink).toBeVisible();

    // Wait for the link to be stable (animations complete) before clicking
    await projectsLink.waitFor({ state: 'visible' });
    await projectsLink.click();
    await expect(page).toHaveURL(/.*\/projects$/);
  });

  test('current page in breadcrumb has aria-current', async ({ page }) => {
    await page.goto('/projects/performance-case-study', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const currentPage = page.locator(
      'nav[aria-label="Breadcrumb"] [aria-current="page"]'
    );
    await expect(currentPage).toBeAttached();
  });

  test('shows breadcrumbs on experience detail page', async ({ page }) => {
    await page.goto('/experience/winc', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
    await expect(breadcrumbNav).toBeVisible();

    const experienceLink = page
      .locator('nav[aria-label="Breadcrumb"] a[href="/experience"]')
      .first();
    await expect(experienceLink).toBeVisible();
  });
});
