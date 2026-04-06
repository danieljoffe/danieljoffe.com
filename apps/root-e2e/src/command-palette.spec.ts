import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

/**
 * Wait for the dynamically-imported CommandPalette component to mount.
 * The component renders a hidden sentinel `[data-testid="command-palette-ready"]`
 * even when closed, so its presence proves the dynamic import has resolved
 * and the event listeners are attached.
 */
async function waitForCommandPalette(page: import('@playwright/test').Page) {
  await expect(
    page.locator('[data-testid="command-palette-ready"]')
  ).toBeAttached({ timeout: 15000 });
}

/**
 * Open the command palette via programmatic keyboard event dispatch.
 * Headless Chromium on Linux does not reliably deliver modifier key
 * combinations through `page.keyboard.press`, so we dispatch a
 * synthetic KeyboardEvent directly on the document.
 */
async function openPaletteViaKeyboard(page: import('@playwright/test').Page) {
  await waitForCommandPalette(page);
  await page.evaluate(() => {
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      })
    );
  });
  const overlay = page.locator('[data-testid="command-palette-overlay"]');
  await expect(overlay).toBeVisible();
  return overlay;
}

/** Open the command palette by clicking the visible search trigger in the nav. */
async function openPaletteViaClick(page: import('@playwright/test').Page) {
  await waitForCommandPalette(page);
  const trigger = page.locator('[data-testid="search-trigger"]').first();
  await trigger.click();
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
    const overlay = await openPaletteViaKeyboard(page);
    await expect(overlay).toBeVisible();
    const input = page.locator('[cmdk-input]');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('opens via the search trigger button', async ({ page }) => {
    const overlay = await openPaletteViaClick(page);
    await expect(overlay).toBeVisible();
    const input = page.locator('[cmdk-input]');
    await expect(input).toBeVisible();
  });

  test('closes with Escape key', async ({ page }) => {
    const overlay = await openPaletteViaKeyboard(page);

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('closes when clicking the overlay', async ({ page }) => {
    const overlay = await openPaletteViaKeyboard(page);

    // Click the overlay (outside the dialog box)
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(overlay).toBeHidden();
  });

  test('displays grouped search results', async ({ page }) => {
    await openPaletteViaKeyboard(page);

    // Check that group headings are visible
    await expect(page.locator('[cmdk-group-heading]').first()).toBeVisible();

    // Check that items are present
    const items = page.locator('[cmdk-item]');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(5);
  });

  test('filters results when typing', async ({ page }) => {
    await openPaletteViaKeyboard(page);

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
    await openPaletteViaKeyboard(page);

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
    await openPaletteViaClick(page);

    // Wait for items to render, then click the About entry
    const aboutItem = page.locator('[cmdk-item]', { hasText: 'About' });
    await expect(aboutItem).toBeVisible();
    await aboutItem.click();
    await page.waitForURL('**/about');
    expect(page.url()).toContain('/about');
  });

  test('toggles closed with Ctrl+K when already open', async ({ page }) => {
    const overlay = await openPaletteViaKeyboard(page);

    await page.evaluate(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'k',
          ctrlKey: true,
          bubbles: true,
        })
      );
    });
    await expect(overlay).toBeHidden();
  });
});
