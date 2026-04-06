import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

// Use Ctrl+K instead of Meta+K — headless Chromium on Linux does not
// reliably deliver the Meta (Super) key to the page, causing flaky failures
// in CI.  The CommandPalette component accepts both metaKey and ctrlKey.
const OPEN_SHORTCUT = 'Control+k';

/** Press the shortcut and wait for the overlay to appear. */
async function openPalette(page: import('@playwright/test').Page) {
  await page.keyboard.press(OPEN_SHORTCUT);
  const overlay = page.locator('[data-testid="command-palette-overlay"]');
  await expect(overlay).toBeVisible();
  return overlay;
}

test.describe('command palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
  });

  test('opens with Ctrl+K and displays search input', async ({ page }) => {
    const overlay = await openPalette(page);
    await expect(overlay).toBeVisible();
    const input = page.locator('[cmdk-input]');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('closes with Escape key', async ({ page }) => {
    const overlay = await openPalette(page);

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('closes when clicking the overlay', async ({ page }) => {
    const overlay = await openPalette(page);

    // Click the overlay (outside the dialog box)
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(overlay).toBeHidden();
  });

  test('displays grouped search results', async ({ page }) => {
    await openPalette(page);

    // Check that group headings are visible
    await expect(page.locator('[cmdk-group-heading]').first()).toBeVisible();

    // Check that items are present
    const items = page.locator('[cmdk-item]');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(5);
  });

  test('filters results when typing', async ({ page }) => {
    await openPalette(page);

    const items = page.locator('[cmdk-item]');
    // Wait for items to render before counting
    await expect(items.first()).toBeVisible();
    const initialCount = await items.count();

    // Type a specific query that should filter down
    await page.keyboard.type('performance');
    // Wait for the filtered list to settle
    await expect(async () => {
      const count = await items.count();
      expect(count).toBeLessThan(initialCount);
      expect(count).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });
  });

  test('navigates to selected item on Enter', async ({ page }) => {
    await openPalette(page);

    // Type a unique query that only matches the About page
    await page.keyboard.type('About');

    // Wait for at least one filtered item to appear
    const firstItem = page.locator('[cmdk-item]').first();
    await expect(firstItem).toBeVisible();

    // Press Enter to navigate to the first (auto-selected) result
    await page.keyboard.press('Enter');

    // The palette should close and navigate away from the homepage
    const overlay = page.locator('[data-testid="command-palette-overlay"]');
    await expect(overlay).toBeHidden();
    await page.waitForURL(url => url.pathname !== '/');
  });

  test('navigates on click of an item', async ({ page }) => {
    await openPalette(page);

    // Wait for items to render, then click the About entry
    const aboutItem = page.locator('[cmdk-item]', { hasText: 'About' });
    await expect(aboutItem).toBeVisible();
    await aboutItem.click();
    await page.waitForURL('**/about');
    expect(page.url()).toContain('/about');
  });

  test('toggles closed with Ctrl+K when already open', async ({ page }) => {
    const overlay = await openPalette(page);

    await page.keyboard.press(OPEN_SHORTCUT);
    await expect(overlay).toBeHidden();
  });
});
