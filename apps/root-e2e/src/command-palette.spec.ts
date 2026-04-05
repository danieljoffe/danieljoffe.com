import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

test.describe('command palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
  });

  test('opens with Cmd+K and displays search input', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    const overlay = page.locator('[data-testid="command-palette-overlay"]');
    await expect(overlay).toBeVisible();
    const input = page.locator('[cmdk-input]');
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();
  });

  test('closes with Escape key', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    const overlay = page.locator('[data-testid="command-palette-overlay"]');
    await expect(overlay).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(overlay).toBeHidden();
  });

  test('closes when clicking the overlay', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    const overlay = page.locator('[data-testid="command-palette-overlay"]');
    await expect(overlay).toBeVisible();

    // Click the overlay (outside the dialog box)
    await overlay.click({ position: { x: 10, y: 10 } });
    await expect(overlay).toBeHidden();
  });

  test('displays grouped search results', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    // Check that group headings are visible
    await expect(page.locator('[cmdk-group-heading]').first()).toBeVisible();

    // Check that items are present
    const items = page.locator('[cmdk-item]');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(5);
  });

  test('filters results when typing', async ({ page }) => {
    await page.keyboard.press('Meta+k');

    const items = page.locator('[cmdk-item]');
    const initialCount = await items.count();

    // Type a specific query that should filter down
    await page.keyboard.type('performance');
    const filteredCount = await items.count();
    expect(filteredCount).toBeLessThan(initialCount);
    expect(filteredCount).toBeGreaterThan(0);
  });

  test('navigates to selected item on Enter', async ({ page }) => {
    await page.keyboard.press('Meta+k');

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
    await page.keyboard.press('Meta+k');

    // Click the About page entry directly
    const aboutItem = page.locator('[cmdk-item]', { hasText: 'About' });
    await aboutItem.click();
    await page.waitForURL('**/about');
    expect(page.url()).toContain('/about');
  });

  test('toggles closed with Cmd+K when already open', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    const overlay = page.locator('[data-testid="command-palette-overlay"]');
    await expect(overlay).toBeVisible();

    await page.keyboard.press('Meta+k');
    await expect(overlay).toBeHidden();
  });
});
