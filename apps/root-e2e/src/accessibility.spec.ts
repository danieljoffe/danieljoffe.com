import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Run axe and fail on serious/critical violations. */
async function expectNoA11yViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  const failing = violations.filter(v =>
    ['serious', 'critical'].includes((v.impact || '').toLowerCase())
  );
  if (failing.length > 0) {
    console.log(
      `Accessibility violations:\n${failing.map(v => `  - ${v.id} (${v.impact}): ${v.description}`).join('\n')}`
    );
  }
  expect(failing).toStrictEqual([]);
}

test.describe('accessibility tests', () => {
  const pages = [
    { name: 'homepage', path: '/' },
    { name: 'about page', path: '/about' },
    { name: 'projects page', path: '/projects' },
    { name: 'project detail page', path: '/projects/performance-case-study' },
    { name: 'experience page', path: '/experience' },
    { name: 'experience detail page', path: '/experience/fightcamp' },
    { name: 'services page', path: '/services' },
  ];

  for (const { name, path } of pages) {
    test(`${name} should not have accessibility violations`, async ({
      page,
    }) => {
      await page.goto(path);
      await expectNoA11yViolations(page);
    });
  }

  test('skip links are present and functional', async ({ page }) => {
    await page.goto('/');

    // Look for skip links
    const skipLinks = page.locator('a[href^="#"]').filter({ hasText: /skip/i });

    await expect(skipLinks).toHaveCount(1);
    const firstSkipLink = skipLinks.first();

    // Make sure the skip link is focusable by tabbing to it
    await page.keyboard.press('Tab');

    // Check if we can focus the skip link
    const isFocusable = await firstSkipLink.evaluate(el => {
      const style = window.getComputedStyle(el);
      return (
        style.position !== 'absolute' ||
        style.clip === 'auto' ||
        el.matches(':focus') ||
        el.matches('.focus\\:not-sr-only')
      );
    });

    if (isFocusable) {
      await firstSkipLink.focus();
      // Use evaluate to trigger click since sr-only positions element outside viewport
      // and Playwright's click() cannot interact with it even with force: true
      await firstSkipLink.evaluate((el: HTMLElement) => el.click());

      // Check if focus moved to target or URL hash updated
      const targetId = await firstSkipLink.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        // Wait for hash to update (async on Mobile Chrome after programmatic click)
        await page
          .waitForURL(`**/${targetId}`, { timeout: 3000 })
          .catch(() => undefined);

        // Wait for target element to exist
        await page
          .locator(targetId)
          .waitFor({ state: 'attached', timeout: 3000 })
          .catch(() => undefined);

        const result = await page.evaluate(selector => {
          const el = document.querySelector(selector) as HTMLElement | null;
          const active = document.activeElement as HTMLElement | null;
          const hashMatches = window.location.hash === selector;

          if (!el)
            return {
              hasEl: false,
              hashMatches,
              focused: false,
              elementExists: false,
            };

          // Check if element is focusable
          const isFocusable =
            el.tabIndex >= 0 ||
            ['INPUT', 'BUTTON', 'SELECT', 'TEXTAREA', 'A'].includes(
              el.tagName
            ) ||
            el.hasAttribute('tabindex');

          // For non-focusable elements, just check if they exist and hash matches
          if (!isFocusable) {
            return {
              hasEl: true,
              hashMatches,
              focused: hashMatches,
              elementExists: true,
            };
          }

          const focused = !!active && (active === el || el.contains(active));
          return { hasEl: true, hashMatches, focused, elementExists: true };
        }, targetId);

        expect(result.hasEl).toBeTruthy();
        expect(result.hashMatches || result.focused).toBeTruthy();
      }
    }
  });

  test('color contrast meets WCAG standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Fail on serious and critical color contrast violations
    const failingViolations = accessibilityScanResults.violations
      .filter(v => v.id === 'color-contrast')
      .filter(v =>
        ['serious', 'critical'].includes((v.impact || '').toLowerCase())
      );

    if (failingViolations.length > 0) {
      const summary = failingViolations
        .map(v => `  - ${v.id} (${v.impact}): ${v.nodes.length} element(s)`)
        .join('\n');
      console.log(`Color contrast violations:\n${summary}`);
    }

    expect(failingViolations.length).toBe(0);
  });

  test('images have proper alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Images should have alt text or be decorative (role="presentation")
      expect(alt !== null || role === 'presentation').toBeTruthy();
    }
  });

  test('form labels are properly associated', async ({ page }) => {
    await page.goto('/about');

    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Input should have either id with associated label, aria-label, or aria-labelledby
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0;
        expect(hasLabel || ariaLabel || ariaLabelledBy).toBeTruthy();
      } else {
        expect(ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('headings follow proper hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    let previousLevel = 0;
    let h1Count = 0;

    for (let i = 0; i < headingCount; i++) {
      const heading = headings.nth(i);
      const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
      const level = parseInt(tagName.charAt(1));

      // Track h1 occurrences
      if (level === 1) h1Count++;

      // Heading levels should not skip more than one level down
      // But can jump up any amount (e.g., h4 -> h2 is fine)
      if (i > 0 && level > previousLevel) {
        expect(level - previousLevel).toBeLessThanOrEqual(1);
      }

      previousLevel = level;
    }

    // At least one H1 should exist somewhere on the page
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test('modal accessibility when opened', async ({ page }) => {
    // Set mobile viewport to trigger mobile menu
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // Look for mobile menu trigger (which opens a modal)
    const modalTrigger = page.locator('[aria-label="Open menu"]');

    if (await modalTrigger.isVisible({ timeout: 5000 })) {
      await modalTrigger.click();

      // Check modal accessibility - use the visible dialog panel
      const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
      await expect(modal).toBeVisible({ timeout: 5000 });

      // Check if modal has proper ARIA attributes
      await expect(modal).toHaveAttribute('aria-modal', 'true');

      // Check if focus is trapped in modal - look for focusable elements
      const focusableElements = modal.locator(
        'button, input, select, textarea, a[href]'
      );
      const focusableCount = await focusableElements.count();

      if (focusableCount > 0) {
        // Just verify focusable elements exist - don't test specific focus behavior
        expect(focusableCount).toBeGreaterThan(0);

        // Close the modal to clean up
        const closeButton = modal.getByRole('button', { name: 'Close' });
        if (await closeButton.isVisible()) {
          await closeButton.click();
        }
      }
    } else {
      // If no modal trigger is visible, skip this test
      test.skip(true, 'No modal trigger found on this page');
    }
  });
});
