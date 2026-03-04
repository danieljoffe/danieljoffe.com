import { test, expect } from '@playwright/test';
import { INVALID_UUID } from './fixtures/audit-mock-data';

// VR baselines are captured with mocked system fonts (not Google Fonts).
// Font mocking is a build-time webpack plugin triggered by CI=true or MOCK_FONTS=true.
// Running without mocked fonts produces different rendering and fails the comparisons.
//
// IMPORTANT: Baseline snapshot generation for CI
// ================================================
// Visual regression baselines MUST be generated in the CI environment (Linux)
// to ensure cross-platform consistency. Playwright uses platform-specific snapshot
// names (e.g., homepage-chromium-linux.png vs homepage-chromium-darwin.png).
//
// To regenerate baselines in CI:
// 1. Temporarily modify .github/workflows/ci.yml to add --update-snapshots flag
// 2. Push changes and let CI run
// 3. Download the updated snapshots from CI artifacts
// 4. Commit the new baseline images
// 5. Remove the --update-snapshots flag
//
// DO NOT commit darwin/macOS snapshots - they will not match in CI.
const fontsAreMocked = !!process.env.CI || process.env.MOCK_FONTS === 'true';

test.describe('visual regression', () => {
  test.skip(
    !fontsAreMocked,
    'VR tests require mocked fonts (set MOCK_FONTS=true or run in CI)'
  );

  test.beforeEach(async ({ page }) => {
    // Use consistent desktop viewport for screenshot comparisons
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('homepage visual regression', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });
    // Wait for GSAP animations to settle — they affect layout height.
    // Poll until document height stabilises (two consecutive reads match).
    await expect
      .poll(
        async () => {
          const h1 = await page.evaluate(() => document.body.scrollHeight);
          await new Promise(r => setTimeout(r, 250));
          const h2 = await page.evaluate(() => document.body.scrollHeight);
          return h1 === h2;
        },
        { timeout: 5000 }
      )
      .toBeTruthy();

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      // Homepage has GSAP animations that cause layout height variance
      maxDiffPixelRatio: 0.05,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('about page visual regression', async ({ page }) => {
    await page.goto('/about', { waitUntil: 'domcontentloaded' });
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
    await page.goto('/experience', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('experience-listing.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('experience detail visual regression', async ({ page }) => {
    await page.goto('/experience/fightcamp', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.locator('h2').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('experience-detail.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('projects listing visual regression', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('projects-listing.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('project detail visual regression', async ({ page }) => {
    await page.goto('/projects/performance-case-study', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('load');
    await page.locator('h1, h2').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('project-detail.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('services page visual regression', async ({ page }) => {
    await page.goto('/services', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('services.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('audit scan page visual regression', async ({ page }) => {
    await page.goto('/audit', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    await page.locator('h1').first().waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('audit-scan.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });

  test('audit report not-found visual regression', async ({ page }) => {
    await page.goto(`/audit/r/${INVALID_UUID}`, {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('load');
    await page
      .getByRole('heading', { name: 'Report Not Found' })
      .waitFor({ state: 'visible' });

    await expect(page).toHaveScreenshot('audit-report-not-found.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.02,
      mask: [page.locator('[data-gsap]')],
    });
  });
});
