import { test, expect } from '@playwright/test';
import { PRIMARY_NAV_LINKS } from './fixtures/test-data';
import { waitForHydration } from './fixtures/base.fixture';

test.describe('desktop navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('navigates through all primary nav links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // Wait for dynamically loaded TabletUpNav
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();

    for (const link of PRIMARY_NAV_LINKS) {
      const navLink = page
        .locator('nav[aria-label="Primary"]')
        .locator(`a[href="${link.href}"]`)
        .first();
      await expect(navLink).toBeVisible();
    }
  });

  test('nav links are accessible with visible text', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();

    for (const link of PRIMARY_NAV_LINKS) {
      const navLink = page
        .locator('nav[aria-label="Primary"]')
        .locator(`a`, { hasText: link.label });
      await expect(navLink).toBeAttached();
    }
  });

  test('highlights current page with aria-current', async ({ page }) => {
    await page.goto('/services', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();

    const servicesLink = page.locator(
      'nav[aria-label="Primary"] a[href="/services"][aria-current="page"]'
    );
    await expect(servicesLink).toBeAttached();
  });

  test('clicking nav link navigates to correct page', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();

    const projectsLink = page
      .locator('nav[aria-label="Primary"]')
      .locator('a[href="/projects"]')
      .first();
    await projectsLink.click();

    await expect(page).toHaveURL(/.*projects/);
  });

  test('more dropdown contains About and Blog', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // Wait for dynamically loaded nav
    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();

    // Click the More dropdown trigger — the Dropdown component renders a
    // wrapper <button> around the trigger content
    const moreTrigger = page
      .locator('nav[aria-label="Primary"]')
      .locator('button[aria-haspopup="true"]');
    await expect(moreTrigger).toBeVisible();
    await moreTrigger.click();

    // The dropdown menu should appear with About and Blog
    const menu = page.locator('[role="menu"]');
    await expect(menu).toBeVisible();
    await expect(
      menu.locator('[role="menuitem"]', { hasText: 'About' })
    ).toBeVisible();
    await expect(
      menu.locator('[role="menuitem"]', { hasText: 'Blog' })
    ).toBeVisible();
  });

  test('free Audit CTA is visible', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    await expect(page.locator('nav[aria-label="Primary"]')).toBeVisible();

    const auditLink = page
      .locator('nav[aria-label="Main navigation"]')
      .locator('a[href="/audit"]', { hasText: 'Free Audit' });
    await expect(auditLink).toBeVisible();
  });
});

test.describe('mobile navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
  });

  test('shows bottom bar with primary links', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();

    for (const link of PRIMARY_NAV_LINKS) {
      const navLink = bottomNav.locator(`a[href="${link.href}"]`).first();
      await expect(navLink).toBeVisible();
    }
  });

  test('opens More sheet on More button click', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // The More button is in the bottom bar
    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();

    const moreButton = bottomNav.getByLabel('Open more menu');
    await expect(moreButton).toBeVisible();
    await moreButton.click();

    const sheet = page.locator('[role="dialog"][aria-label="More navigation"]');
    await expect(sheet).toBeVisible();
  });

  test('closes More sheet on close button click', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();

    // Open
    await bottomNav.getByLabel('Open more menu').click();
    const sheet = page.locator('[role="dialog"][aria-label="More navigation"]');
    await expect(sheet).toBeVisible();

    // Close via the backdrop overlay — use dispatchEvent because the fixed
    // bottom nav bar (z-50) sits above the overlay (z-40) and intercepts
    // normal Playwright clicks.
    const overlay = page.locator('.fixed.inset-0.bg-black\\/40');
    await overlay.dispatchEvent('click');
    await expect(sheet).toBeHidden();
  });

  test('navigates from More sheet', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    const bottomNav = page.locator('nav[aria-label="Mobile navigation"]');
    await expect(bottomNav).toBeVisible();

    // Open More sheet
    await bottomNav.getByLabel('Open more menu').click();
    const sheet = page.locator('[role="dialog"][aria-label="More navigation"]');
    await expect(sheet).toBeVisible();

    // Click About
    // The sheet is fixed-positioned and may be outside the Playwright
    // viewport boundary; dispatch click programmatically.
    const aboutButton = sheet.locator('button', { hasText: 'About' });
    await expect(aboutButton).toBeVisible();
    await aboutButton.dispatchEvent('click');

    await expect(page).toHaveURL(/.*about/);
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
