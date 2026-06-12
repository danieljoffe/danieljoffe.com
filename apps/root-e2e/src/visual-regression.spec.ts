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

/**
 * Pages tested for visual regression, shared between desktop and mobile.
 */
const pages = [
  {
    name: 'homepage',
    path: '/',
    headingSelector: 'h1',
    maxDiffPixelRatio: 0.05,
    waitForStableHeight: true,
    maskHCaptcha: false,
  },
  {
    name: 'about',
    path: '/about',
    headingSelector: 'h1',
    maxDiffPixelRatio: 0.02,
    waitForStableHeight: false,
    maskHCaptcha: true,
  },
  {
    name: 'experience-listing',
    path: '/experience',
    headingSelector: 'h1',
    maxDiffPixelRatio: 0.02,
    waitForStableHeight: false,
    maskHCaptcha: false,
  },
  {
    name: 'experience-detail',
    path: '/experience/fightcamp',
    headingSelector: 'h2',
    maxDiffPixelRatio: 0.02,
    waitForStableHeight: false,
    maskHCaptcha: false,
  },
  {
    name: 'projects-listing',
    path: '/projects',
    headingSelector: 'h1',
    maxDiffPixelRatio: 0.02,
    waitForStableHeight: false,
    maskHCaptcha: false,
  },
  {
    name: 'project-detail',
    path: '/projects/performance-case-study',
    headingSelector: 'h1, h2',
    maxDiffPixelRatio: 0.02,
    waitForStableHeight: false,
    maskHCaptcha: false,
  },
  {
    name: 'audit-scan',
    path: '/audit',
    headingSelector: 'h1',
    maxDiffPixelRatio: 0.02,
    waitForStableHeight: false,
    maskHCaptcha: false,
  },
  {
    name: 'audit-report-not-found',
    path: `/audit/r/${INVALID_UUID}`,
    headingSelector: undefined,
    maxDiffPixelRatio: 0.02,
    waitForStableHeight: false,
    maskHCaptcha: false,
  },
] as const;

/**
 * Wait for the page to load and heading to be visible.
 */
async function waitForPageReady(
  page: import('@playwright/test').Page,
  entry: (typeof pages)[number]
) {
  await page.goto(entry.path, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('load');

  if (entry.name === 'audit-report-not-found') {
    await page
      .getByRole('heading', { name: 'Report Not Found' })
      .waitFor({ state: 'visible' });
  } else {
    await page
      .locator(entry.headingSelector!)
      .first()
      .waitFor({ state: 'visible' });
  }

  if (entry.waitForStableHeight) {
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
  }
}

/**
 * Build the mask locators for a page.
 */
function getMasks(
  page: import('@playwright/test').Page,
  entry: (typeof pages)[number]
) {
  const masks: import('@playwright/test').Locator[] = [];
  if (entry.maskHCaptcha) {
    // TODO: add data-testid="hcaptcha-container" to the hCaptcha wrapper component
    masks.push(page.locator('.min-h-\\[78px\\]'));
  }
  return masks;
}

test.describe('visual regression', () => {
  test.skip(
    !fontsAreMocked,
    'VR tests require mocked fonts (set MOCK_FONTS=true or run in CI)'
  );

  test.describe('desktop (1280x720)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    for (const entry of pages) {
      test(`${entry.name} visual regression`, async ({ page }) => {
        await waitForPageReady(page, entry);
        await expect(page).toHaveScreenshot(`${entry.name}.png`, {
          fullPage: true,
          maxDiffPixelRatio: entry.maxDiffPixelRatio,
          mask: getMasks(page, entry),
        });
      });
    }
  });

  test.describe('mobile (390x844)', () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
    });

    for (const entry of pages) {
      test(`${entry.name} mobile visual regression`, async ({ page }) => {
        await waitForPageReady(page, entry);
        await expect(page).toHaveScreenshot(`${entry.name}-mobile.png`, {
          fullPage: true,
          maxDiffPixelRatio: entry.maxDiffPixelRatio,
          mask: getMasks(page, entry),
        });
      });
    }
  });
});
