import { test, expect } from '@playwright/test';
import { PROJECT_SLUGS, EXPERIENCE_SLUGS } from './fixtures/test-data';

test.describe('projects listing page', () => {
  test('displays projects page with heading', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('displays project thumbnails', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Check for project links
    const projectLinks = page.locator('article a[href^="/projects/"]');
    const count = await projectLinks.count();

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('project thumbnail links to detail page', async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const firstProjectLink = page
      .locator('article a[href^="/projects/"]')
      .first();
    await expect(firstProjectLink).toBeVisible();

    await firstProjectLink.click();
    await expect(page).toHaveURL(/\/projects\/.+/);
  });
});

test.describe('project detail pages', () => {
  for (const slug of PROJECT_SLUGS) {
    test(`loads ${slug} project page`, async ({ page }) => {
      await page.goto(`/projects/${slug}`, { waitUntil: 'domcontentloaded' });
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
    await page.goto('/projects/performance-case-study', {
      waitUntil: 'domcontentloaded',
    });

    // Check for structured data script - may be multiple so use first()
    const structuredData = page
      .locator('script[type="application/ld+json"]')
      .first();
    await expect(structuredData).toBeAttached({ timeout: 5000 });
  });

  test('project page has meta description', async ({ page }) => {
    await page.goto('/projects/performance-case-study', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toBeAttached();
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });

  test('project page has Open Graph tags', async ({ page }) => {
    await page.goto('/projects/performance-case-study', {
      waitUntil: 'domcontentloaded',
    });
    await page.waitForLoadState('domcontentloaded');

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toBeAttached();

    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toBeAttached();
  });
});

test.describe('experience listing page', () => {
  test('displays experience page with heading', async ({ page }) => {
    await page.goto('/experience', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const heading = page.locator('h1');
    await expect(heading).toBeVisible();
  });

  test('displays experience thumbnails', async ({ page }) => {
    await page.goto('/experience', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Check for experience links
    const experienceLinks = page.locator('article a[href^="/experience/"]');
    const count = await experienceLinks.count();

    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('experience thumbnail links to detail page', async ({ page }) => {
    await page.goto('/experience', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const firstExperienceLink = page
      .locator('article a[href^="/experience/"]')
      .first();
    await expect(firstExperienceLink).toBeVisible();

    await firstExperienceLink.click();
    await expect(page).toHaveURL(/\/experience\/.+/);
  });
});

test.describe('experience detail pages', () => {
  for (const slug of EXPERIENCE_SLUGS) {
    test(`loads ${slug} experience page`, async ({ page }) => {
      await page.goto(`/experience/${slug}`, { waitUntil: 'domcontentloaded' });
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
    await page.goto('/experience/winc', { waitUntil: 'domcontentloaded' });

    // Check for structured data script - may be multiple so use first()
    const structuredData = page
      .locator('script[type="application/ld+json"]')
      .first();
    await expect(structuredData).toBeAttached({ timeout: 5000 });
  });

  test('experience page has meta description', async ({ page }) => {
    await page.goto('/experience/winc', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toBeAttached();
    await expect(metaDescription).toHaveAttribute('content', /.+/);
  });
});

test.describe('invalid routes', () => {
  // With dynamicParams=false, Next.js returns 404, renders error content,
  // or falls back to the parent listing page. All are valid error handling.

  test('invalid project slug does not render detail content', async ({
    page,
  }) => {
    const response = await page.goto('/projects/invalid-slug-xyz-123', {
      waitUntil: 'domcontentloaded',
    });
    const status = response?.status();
    if (status === 404 || status === 500) return;

    await page.waitForLoadState('load');
    const url = page.url();
    const heading = (await page.locator('h1').first().textContent()) ?? '';
    // Accept: 404 content, error boundary, or parent listing page fallback
    expect(
      url.endsWith('/projects') ||
        /not found|404/i.test(heading) ||
        heading.toLowerCase() === 'projects'
    ).toBeTruthy();
  });

  test('invalid experience slug does not render detail content', async ({
    page,
  }) => {
    const response = await page.goto('/experience/invalid-company-xyz', {
      waitUntil: 'domcontentloaded',
    });
    const status = response?.status();
    if (status === 404 || status === 500) return;

    await page.waitForLoadState('load');
    const url = page.url();
    const heading = (await page.locator('h1').first().textContent()) ?? '';
    expect(
      url.endsWith('/experience') ||
        /not found|404/i.test(heading) ||
        heading.toLowerCase() === 'experience'
    ).toBeTruthy();
  });
});
