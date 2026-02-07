import { test, expect } from '@playwright/test';

test.describe('visual Regression Tests', () => {
  // TODO(batch-2): Remove this skip after regenerating baselines with mocked fonts.
  // Fixing the font mock webpack regex means CI builds now use system fonts instead
  // of Google Fonts, so existing baselines no longer match.
  test.skip(!!process.env.CI, 'Baselines need regeneration with mocked fonts');

  test.beforeEach(async ({ page }) => {
    // Use consistent desktop viewport for screenshot comparisons
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('homepage visual regression', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('h1').first().waitFor({ state: 'visible' });
    // Wait for GSAP animations to settle — they affect layout height
    await page.waitForTimeout(1000);

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      // Homepage has GSAP animations that cause layout height variance
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('about page visual regression', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('about.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [
        // Mask hCaptcha widget which loads dynamically
        page.locator('.min-h-\\[78px\\]'),
        page.locator('[data-gsap]'),
      ],
    });
  });

  test('experience listing visual regression', async ({ page }) => {
    await page.goto('/experience');
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('experience-listing.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('experience detail visual regression', async ({ page }) => {
    await page.goto('/experience/fightcamp');
    await page.waitForLoadState('load');
    await page.locator('h2').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('experience-detail.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('projects listing visual regression', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('projects-listing.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('project detail visual regression', async ({ page }) => {
    await page.goto('/projects/performance-case-study');
    await page.waitForLoadState('load');
    await page.locator('h1, h2').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('project-detail.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('services page visual regression', async ({ page }) => {
    await page.goto('/services');
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('services.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });
});
