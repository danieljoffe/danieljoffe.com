import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

test.describe('theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
  });

  test('page loads with a theme applied', async ({ page }) => {
    // The ThemeProvider toggles the "dark" class on <html> based on the
    // resolved theme. The absence of "dark" means light mode is active.
    // Either way, the <html> element should exist and have a known state.
    const html = page.locator('html');
    await expect(html).toBeAttached();

    // Verify the theme toggle button is visible in the nav
    const themeButton = page.getByRole('button', {
      name: /switch to .+ mode/i,
    });
    await expect(themeButton).toBeVisible();
  });

  test('clicking the theme toggle switches the theme', async ({ page }) => {
    const themeButton = page.getByRole('button', {
      name: /switch to .+ mode/i,
    });
    await expect(themeButton).toBeVisible();

    // The DarkModeToggle cycles: system → light → dark → system.
    // The initial state depends on the system preference, but the button
    // label tells us what the next state will be.
    const initialLabel = await themeButton.getAttribute('aria-label');

    // Click to cycle the theme
    await themeButton.click();

    // The aria-label should change to reflect the new next-theme
    await expect(themeButton).not.toHaveAttribute('aria-label', initialLabel!);
  });

  test('theme persists across navigation', async ({ page }) => {
    const themeButton = page.getByRole('button', {
      name: /switch to .+ mode/i,
    });
    await expect(themeButton).toBeVisible();

    // Click to cycle to the next theme
    await themeButton.click();

    // Capture the new label after toggling
    const newLabel = await themeButton.getAttribute('aria-label');

    // Navigate to a different page
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // The theme toggle button should still reflect the same state
    const themeButtonAfterNav = page.getByRole('button', {
      name: /switch to .+ mode/i,
    });
    await expect(themeButtonAfterNav).toBeVisible();
    await expect(themeButtonAfterNav).toHaveAttribute('aria-label', newLabel!);
  });

  test('theme toggle cycles through all three modes', async ({ page }) => {
    const themeButton = page.getByRole('button', {
      name: /switch to .+ mode/i,
    });
    await expect(themeButton).toBeVisible();

    // Collect labels through a full cycle (3 clicks)
    const labels: string[] = [];
    for (let i = 0; i < 3; i++) {
      const label = await themeButton.getAttribute('aria-label');
      labels.push(label!);
      await themeButton.click();
      // Wait for the label to change before the next iteration
      await expect(themeButton).not.toHaveAttribute('aria-label', label!);
    }

    // After a full cycle, the label should return to the initial state
    const finalLabel = themeButton;
    await expect(finalLabel).toHaveAttribute('aria-label', labels[0]);

    // All three labels should be unique (light, dark, system)
    const uniqueLabels = new Set(labels);
    expect(uniqueLabels.size).toBe(3);
  });

  test('theme toggle is accessible via keyboard shortcut', async ({ page }) => {
    const themeButton = page.getByRole('button', {
      name: /switch to .+ mode/i,
    });
    await expect(themeButton).toBeVisible();

    const initialLabel = await themeButton.getAttribute('aria-label');

    // The DarkModeToggle binds the "d" key via useKeyboardShortcut
    await page.keyboard.press('d');

    // Label should change indicating the theme cycled
    await expect(themeButton).not.toHaveAttribute('aria-label', initialLabel!);
  });
});
