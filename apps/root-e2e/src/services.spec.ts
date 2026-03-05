import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

test.describe('services page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/services', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');
    // Wait for hydration before interacting with accordion buttons
    await waitForHydration(page);
  });

  test('renders all service cards', async ({ page }) => {
    const cards = [
      'Performance Audits & Optimization',
      'Component Libraries & Design Systems',
      'CMS & Self-Serve Tooling',
      'MVP & Product Frontend Builds',
    ];
    for (const title of cards) {
      await expect(page.getByRole('heading', { name: title })).toBeVisible();
    }
  });

  test('service cards show pricing and timeline', async ({ page }) => {
    // Spot-check first card
    const firstCard = page
      .locator('li')
      .filter({ hasText: 'Performance Audits' })
      .first();
    await expect(firstCard.locator('text=$5,000')).toBeVisible();
    await expect(firstCard.locator('text=2-4 weeks')).toBeVisible();
  });

  test('the FAQ accordion expands and collapses', async ({ page }) => {
    const faqSection = page.locator('section[aria-labelledby="faq-heading"]');
    const firstQuestion = faqSection.locator('button[aria-expanded]').first();
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

    // Expand
    await firstQuestion.click();
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');

    // Collapse
    await firstQuestion.click();
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  test('only one FAQ item is open at a time', async ({ page }) => {
    const faqSection = page.locator('section[aria-labelledby="faq-heading"]');
    const questions = faqSection.locator('button[aria-expanded]');
    const count = questions;
    await expect(count).toHaveCount(5);

    // Open first
    await questions.nth(0).click();
    await expect(questions.nth(0)).toHaveAttribute('aria-expanded', 'true');

    // Open second — first should close
    await questions.nth(1).click();
    await expect(questions.nth(1)).toHaveAttribute('aria-expanded', 'true');
    await expect(questions.nth(0)).toHaveAttribute('aria-expanded', 'false');
  });

  test('the CTA buttons link to booking page', async ({ page }) => {
    const ctaButtons = page.locator('a:has-text("Book a Discovery Call")');
    const count = await ctaButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);

    for (let i = 0; i < count; i++) {
      const href = await ctaButtons.nth(i).getAttribute('href');
      expect(href).toContain('calendly.com');
    }
  });

  test('page has structured data', async ({ page }) => {
    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});
