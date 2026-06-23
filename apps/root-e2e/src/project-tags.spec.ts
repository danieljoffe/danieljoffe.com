import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

test.describe('project listing and tag filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
  });

  test('loads the projects page with project cards visible', async ({
    page,
  }) => {
    const projectLinks = page.locator(
      '[data-testid="post-list"] a[href^="/projects/"]'
    );
    await expect(projectLinks.first()).toBeVisible();
    await expect(projectLinks).not.toHaveCount(0);
  });

  test('filters projects by clicking a tag chip', async ({ page }) => {
    const tagNav = page.locator('nav[aria-label="Filter projects by tag"]');
    await expect(tagNav).toBeVisible();

    const firstTagButton = tagNav.locator('button[aria-pressed]').first();
    await expect(firstTagButton).toBeVisible();

    // Get initial project count
    const projectLinks = page.locator(
      '[data-testid="post-list"] a[href^="/projects/"]'
    );
    await expect(projectLinks.first()).toBeVisible();
    // Click the tag to filter
    await firstTagButton.click();

    // A filter summary should appear. Scope to the polite region that carries
    // the tag-count text — the page has several aria-live="polite" regions
    // (the site-wide RouteAnnouncer being the other), so an unscoped locator
    // is a strict-mode violation.
    const filterSummary = page
      .locator('[aria-live="polite"]')
      .filter({ hasText: /\d+ case stud(y|ies) tagged/ });
    await expect(filterSummary).toBeVisible({ timeout: 15000 });
    await expect(filterSummary).toContainText(/\d+ case stud(y|ies) tagged/);

    // The number of visible projects should change (could be same if all match,
    // but the filter summary confirms filtering is active)
  });

  test('tag chip shows aria-pressed state when active', async ({ page }) => {
    const tagNav = page.locator('nav[aria-label="Filter projects by tag"]');
    const firstTagButton = tagNav.locator('button[aria-pressed]').first();
    await expect(firstTagButton).toBeVisible();

    // Initially not pressed
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'false');

    // Click to activate
    await firstTagButton.click();

    // Now pressed
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('clicking active tag chip deselects it and shows all projects', async ({
    page,
  }) => {
    const tagNav = page.locator('nav[aria-label="Filter projects by tag"]');
    const firstTagButton = tagNav.locator('button[aria-pressed]').first();

    // Get initial project count
    const projectLinks = page.locator(
      '[data-testid="post-list"] a[href^="/projects/"]'
    );
    await expect(projectLinks.first()).toBeVisible();
    const initialCount = await projectLinks.count();

    // Activate the tag
    await firstTagButton.click();
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'true');

    // Filter summary should be visible. Scope to the tag-count polite region —
    // the site-wide RouteAnnouncer is another aria-live="polite" element, so an
    // unscoped locator is a strict-mode violation.
    const filterSummary = page
      .locator('[aria-live="polite"]')
      .filter({ hasText: /\d+ case stud(y|ies) tagged/ });
    await expect(filterSummary).toBeVisible({ timeout: 15000 });

    // Deactivate the tag by clicking again
    await firstTagButton.click();
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'false');

    // Filter summary should disappear
    await expect(filterSummary).toBeHidden();

    // All projects should be visible again
    await expect(projectLinks).toHaveCount(initialCount);
  });

  test('project tag page (/projects/tags/{tag}) shows filtered projects', async ({
    page,
  }) => {
    // Navigate to the tags index
    await page.goto('/projects/tags', { waitUntil: 'domcontentloaded' });

    // Find the first tag link
    const tagLink = page.locator('a[href^="/projects/tags/"]').first();
    await expect(tagLink).toBeVisible();

    const tagHref = await tagLink.getAttribute('href');
    await tagLink.click();

    await expect(page).toHaveURL(
      new RegExp(tagHref!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );

    // The tag detail page should load with a heading
    await expect(
      page.locator('h1, [role="heading"][aria-level="1"]').first()
    ).toBeVisible();
  });

  test('navigates to a project detail page from the listing', async ({
    page,
  }) => {
    const projectLink = page
      .locator('[data-testid="post-list"] a[href^="/projects/"]')
      .first();
    await expect(projectLink).toBeVisible();

    const href = await projectLink.getAttribute('href');
    await projectLink.click();

    await expect(page).toHaveURL(
      new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );

    // The detail page should have a heading
    await expect(
      page.locator('h1, [role="heading"][aria-level="1"]').first()
    ).toBeVisible();
  });
});
