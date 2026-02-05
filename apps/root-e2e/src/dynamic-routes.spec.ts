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
    await page.waitForLoadState('domcontentloaded');

    // Should get error status (404 or 500), show error page, OR redirect to listing
    const status = response?.status();
    const currentUrl = page.url();
    const is404Page = await page.locator('h1:has-text("404")').isVisible();
    const isNotFound = await page
      .locator('text=/not found|page not found|project not found/i')
      .isVisible();
    const isErrorStatus = status === 404 || status === 500;
    const redirectedToListing = currentUrl.endsWith('/projects');

    expect(
      isErrorStatus || is404Page || isNotFound || redirectedToListing
    ).toBeTruthy();
  });

  test('invalid experience slug shows error page or redirects to listing', async ({
    page,
  }) => {
    const response = await page.goto('/experience/invalid-company-xyz');
    await page.waitForLoadState('domcontentloaded');

    const status = response?.status();
    const currentUrl = page.url();
    const is404Page = await page.locator('h1:has-text("404")').isVisible();
    const isNotFound = await page
      .locator('text=/not found|page not found|experience not found/i')
      .isVisible();
    const isErrorStatus = status === 404 || status === 500;
    const redirectedToListing = currentUrl.endsWith('/experience');

    expect(
      isErrorStatus || is404Page || isNotFound || redirectedToListing
    ).toBeTruthy();
  });
});
