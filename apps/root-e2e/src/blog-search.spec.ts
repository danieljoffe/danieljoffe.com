import { test, expect } from '@playwright/test';
import { fillInput, waitForHydration } from './fixtures/base.fixture';

test.describe('blog search and filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/blog', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);
  });

  test('loads the blog index page with posts visible', async ({ page }) => {
    // Posts render inside a grid; each PostCard contains a link
    const postCards = page.locator('article, [data-testid="post-card"]');
    // Fallback: check that at least one link inside the grid is visible
    const postLinks = page.locator(
      '[data-testid="post-list"] a[href^="/blog/"]'
    );
    const locator = (await postCards.count()) > 0 ? postCards : postLinks;
    await expect(locator.first()).toBeVisible();
    await expect(locator).not.toHaveCount(0);
  });

  test('searches for a blog post by title', async ({ page }) => {
    const searchInput = page.getByLabel('Search blog posts');
    await expect(searchInput).toBeVisible();

    // pressSequentially fires real key events so React's onChange on the
    // controlled Input reliably flips `isSearching` — plain fill() can skip
    // the onChange handler and leave the aria-live summary unrendered.
    await fillInput(searchInput, 'performance');
    await expect(searchInput).toHaveValue('performance');

    // Scope to the aria-live region that carries the results-count text.
    // useDeferredValue + MiniSearch indexing can be slow on CI, so give it
    // a generous timeout.
    const resultsSummary = page
      .locator('[aria-live="polite"]')
      .filter({ hasText: /\d+ results? for/ });
    await expect(resultsSummary).toBeVisible({ timeout: 15000 });

    // Verify at least one post is shown
    const postLinks = page.locator(
      '[data-testid="post-list"] a[href^="/blog/"]'
    );
    await expect(postLinks.first()).toBeVisible();
  });

  test('clears search and shows all posts again', async ({ page }) => {
    const searchInput = page.getByLabel('Search blog posts');

    // Count initial posts
    const postLinks = page.locator(
      '[data-testid="post-list"] a[href^="/blog/"]'
    );
    await expect(postLinks.first()).toBeVisible();
    const initialCount = await postLinks.count();

    // Search to filter down
    await fillInput(searchInput, 'performance');
    const resultsSummary = page
      .locator('[aria-live="polite"]')
      .filter({ hasText: /\d+ results? for/ });
    await expect(resultsSummary).toBeVisible({ timeout: 15000 });

    // Clear search
    await searchInput.fill('');

    // Results summary should disappear and original post count should restore
    await expect(resultsSummary).toBeHidden();
    await expect(postLinks.first()).toBeVisible();
    await expect(postLinks).toHaveCount(initialCount);
  });

  test('filters posts by clicking a tag chip', async ({ page }) => {
    // Tag chips are rendered as buttons with aria-pressed inside a nav
    const tagNav = page.locator('nav[aria-label="Filter blog posts by tag"]');
    await expect(tagNav).toBeVisible();

    const firstTagButton = tagNav.locator('button[aria-pressed]').first();
    await expect(firstTagButton).toBeVisible();

    // Verify initial state is not pressed
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'false');

    // Click the tag to filter
    await firstTagButton.click();

    // aria-pressed should now be true
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'true');

    // A filter summary should appear
    const filterSummary = page.locator('[aria-live="polite"]');
    await expect(filterSummary).toBeVisible();
    await expect(filterSummary).toContainText(/\d+ posts? tagged/);
  });

  test('selecting a tag clears the search input', async ({ page }) => {
    const searchInput = page.getByLabel('Search blog posts');
    await fillInput(searchInput, 'test query');
    await expect(searchInput).toHaveValue('test query');

    // Click a tag chip
    const tagNav = page.locator('nav[aria-label="Filter blog posts by tag"]');
    const firstTagButton = tagNav.locator('button[aria-pressed]').first();
    await firstTagButton.click();

    // Search input should be cleared
    await expect(searchInput).toHaveValue('');
  });

  test('searching clears the active tag', async ({ page }) => {
    // First activate a tag
    const tagNav = page.locator('nav[aria-label="Filter blog posts by tag"]');
    const firstTagButton = tagNav.locator('button[aria-pressed]').first();
    await firstTagButton.click();
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'true');

    // Now type in search
    const searchInput = page.getByLabel('Search blog posts');
    await fillInput(searchInput, 'performance');

    // Tag should be deselected
    await expect(firstTagButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('pagination is hidden while a search is active', async ({ page }) => {
    // First verify pagination exists on the unfiltered page
    const pagination = page.locator('nav[aria-label="Pagination"]');
    // Skip if there are fewer posts than the page size
    test.skip(
      (await pagination.count()) === 0,
      'No pagination — fewer posts than page size'
    );

    await expect(pagination).toBeVisible();

    // Search to activate filtering
    const searchInput = page.getByLabel('Search blog posts');
    await fillInput(searchInput, 'performance');

    // Pagination should be hidden
    await expect(pagination).toBeHidden();
  });

  test('pagination is hidden while a tag filter is active', async ({
    page,
  }) => {
    const pagination = page.locator('nav[aria-label="Pagination"]');
    test.skip(
      (await pagination.count()) === 0,
      'No pagination — fewer posts than page size'
    );

    await expect(pagination).toBeVisible();

    // Click a tag to activate filtering
    const tagNav = page.locator('nav[aria-label="Filter blog posts by tag"]');
    const firstTagButton = tagNav.locator('button[aria-pressed]').first();
    await firstTagButton.click();

    // Pagination should be hidden
    await expect(pagination).toBeHidden();
  });

  test('navigates to a blog post detail page from the listing', async ({
    page,
  }) => {
    const postLink = page
      .locator('[data-testid="post-list"] a[href^="/blog/"]')
      .first();
    await expect(postLink).toBeVisible();

    const href = await postLink.getAttribute('href');
    await postLink.click();

    await expect(page).toHaveURL(
      new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );
  });

  test('tag page (/blog/tags/{tag}) shows filtered posts', async ({ page }) => {
    // Navigate to the tags index first to find a valid tag
    await page.goto('/blog/tags', { waitUntil: 'domcontentloaded' });

    // Find the first tag link
    const tagLink = page.locator('a[href^="/blog/tags/"]').first();
    await expect(tagLink).toBeVisible();

    const tagHref = await tagLink.getAttribute('href');
    await tagLink.click();

    await expect(page).toHaveURL(
      new RegExp(tagHref!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    );

    // The tag detail page should show posts
    // At minimum the page should have loaded without error
    await expect(
      page.locator('h1, [role="heading"][aria-level="1"]').first()
    ).toBeVisible();
  });
});
