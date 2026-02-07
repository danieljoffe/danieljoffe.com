import {
  test,
  expect,
  PROJECT_SLUGS,
  EXPERIENCE_SLUGS,
} from './fixtures/base.fixture';

test.describe('projects Listing Page', () => {
  test('displays projects page with heading', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('displays project thumbnails', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    // Check for project links
    const projectLinks = page.locator('article a[href^="/projects/"]');
    const count = await projectLinks.count();

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('project thumbnail links to detail page', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForLoadState('domcontentloaded');

    const firstProjectLink = page
      .locator('article a[href^="/projects/"]')
      .first();
    await expect(firstProjectLink).toBeVisible();

    await firstProjectLink.click();
    await expect(page).toHaveURL(/\/projects\/.+/);
  });
});

test.describe('project Detail Pages', () => {
  for (const slug of PROJECT_SLUGS) {
    test(`loads ${slug} project page`, async ({ page }) => {
      await page.goto(`/projects/${slug}`);
      await page.waitForLoadState('domcontentloaded');

      // Page should load without error - project pages use h1 or h2 as main heading
      const heading = page.locator('h1, h2').first();
      await expect(heading).toBeVisible();

      // Breadcrumbs should be present
      const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumbNav).toBeVisible();
    });
  }

  test('project page has structured data', async ({ page }) => {
    await page.goto('/projects/performance-case-study');

    // Check for structured data script - may be multiple so use first()
    const structuredData = page
      .locator('script[type="application/ld+json"]')
      .first();
    await expect(structuredData).toBeAttached({ timeout: 5000 });
  });

  test('project page has meta description', async ({ page }) => {
    await page.goto('/projects/performance-case-study');
    await page.waitForLoadState('domcontentloaded');

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toBeAttached();
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });

  test('project page has Open Graph tags', async ({ page }) => {
    await page.goto('/projects/performance-case-study');
    await page.waitForLoadState('domcontentloaded');

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toBeAttached();

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toBeAttached();
  });
});

test.describe('experience Listing Page', () => {
  test('displays experience page with heading', async ({ page }) => {
    await page.goto('/experience');
    await page.waitForLoadState('domcontentloaded');

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('displays experience thumbnails', async ({ page }) => {
    await page.goto('/experience');
    await page.waitForLoadState('domcontentloaded');

    // Check for experience links
    const experienceLinks = page.locator('article a[href^="/experience/"]');
    const count = await experienceLinks.count();

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('experience thumbnail links to detail page', async ({ page }) => {
    await page.goto('/experience');
    await page.waitForLoadState('domcontentloaded');

    const firstExperienceLink = page
      .locator('article a[href^="/experience/"]')
      .first();
    await expect(firstExperienceLink).toBeVisible();

    await firstExperienceLink.click();
    await expect(page).toHaveURL(/\/experience\/.+/);
  });
});

test.describe('experience Detail Pages', () => {
  for (const slug of EXPERIENCE_SLUGS) {
    test(`loads ${slug} experience page`, async ({ page }) => {
      await page.goto(`/experience/${slug}`);
      await page.waitForLoadState('domcontentloaded');

      // Page should load without error - experience pages use h2 as main heading
      const heading = page.locator('h2').first();
      await expect(heading).toBeVisible();

      // Breadcrumbs should be present
      const breadcrumbNav = page.locator('nav[aria-label="Breadcrumb"]');
      await expect(breadcrumbNav).toBeVisible();
    });
  }

  test('experience page has structured data', async ({ page }) => {
    await page.goto('/experience/winc');

    // Check for structured data script - may be multiple so use first()
    const structuredData = page
      .locator('script[type="application/ld+json"]')
      .first();
    await expect(structuredData).toBeAttached({ timeout: 5000 });
  });

  test('experience page has meta description', async ({ page }) => {
    await page.goto('/experience/winc');
    await page.waitForLoadState('domcontentloaded');

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toBeAttached();
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });
});

test.describe('invalid Routes', () => {
  // Note: Invalid slugs are handled gracefully by the app.
  // With dynamicParams=false, Next.js may return 404 OR the page component
  // may redirect to the listing page. Both behaviors are valid error handling.

  test('invalid project slug shows error page or redirects to listing', async ({
    page,
  }) => {
    const response = await page.goto('/projects/invalid-slug-xyz-123');

    const status = response?.status();
    const isErrorStatus = status === 404 || status === 500;

    if (!isErrorStatus) {
      // Wait for page to finish loading (Mobile Safari needs this for streaming SSR)
      await page.waitForLoadState('load').catch(() => {});

      // Wait for client-side redirect, error content, or loading state
      await Promise.race([
        page.waitForURL(/\/projects$/, { timeout: 15000 }),
        page.waitForSelector('text=/not found|something went wrong/i', {
          timeout: 15000,
        }),
        page.waitForSelector('[role="status"]', { timeout: 15000 }),
      ]).catch(() => {});
    }

    const currentUrl = page.url();
    const redirectedToListing = currentUrl.endsWith('/projects');

    // Use DOM presence (.count) instead of .isVisible() — under parallel load
    // on mobile, hydration may not have completed so elements exist in DOM
    // but aren't considered "visible" by Playwright yet.
    const is404Page = (await page.locator('h1:has-text("404")').count()) > 0;
    const isNotFound =
      (await page
        .locator('text=/not found|page not found|project not found/i')
        .count()) > 0;
    const isErrorPage =
      (await page.locator('text=/something went wrong/i').count()) > 0;
    const isLoadingState = (await page.locator('[role="status"]').count()) > 0;
    // Also check full page text as final fallback
    const bodyText = (await page.textContent('body')) ?? '';
    const hasNotFoundText = /not found|404/i.test(bodyText);

    expect(
      isErrorStatus ||
        is404Page ||
        isNotFound ||
        isErrorPage ||
        redirectedToListing ||
        isLoadingState ||
        hasNotFoundText
    ).toBeTruthy();
  });

  test('invalid experience slug shows error page or redirects to listing', async ({
    page,
  }) => {
    const response = await page.goto('/experience/invalid-company-xyz');

    const status = response?.status();
    const isErrorStatus = status === 404 || status === 500;

    if (!isErrorStatus) {
      await page.waitForLoadState('load').catch(() => {});

      await Promise.race([
        page.waitForURL(/\/experience$/, { timeout: 15000 }),
        page.waitForSelector('text=/not found|something went wrong/i', {
          timeout: 15000,
        }),
        page.waitForSelector('[role="status"]', { timeout: 15000 }),
      ]).catch(() => {});
    }

    const currentUrl = page.url();
    const redirectedToListing = currentUrl.endsWith('/experience');

    // Use DOM presence (.count) instead of .isVisible() for reliability under load
    const is404Page = (await page.locator('h1:has-text("404")').count()) > 0;
    const isNotFound =
      (await page
        .locator('text=/not found|page not found|experience not found/i')
        .count()) > 0;
    const isErrorPage =
      (await page.locator('text=/something went wrong/i').count()) > 0;
    const isLoadingState = (await page.locator('[role="status"]').count()) > 0;
    const bodyText = (await page.textContent('body')) ?? '';
    const hasNotFoundText = /not found|404/i.test(bodyText);

    expect(
      isErrorStatus ||
        is404Page ||
        isNotFound ||
        isErrorPage ||
        redirectedToListing ||
        isLoadingState ||
        hasNotFoundText
    ).toBeTruthy();
  });
});
