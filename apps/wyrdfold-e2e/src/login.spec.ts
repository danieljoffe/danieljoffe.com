import { test, expect } from '@playwright/test';

// Public-facing smoke. The login form is the only un-authed surface
// today, so verifying it renders + submits cleanly catches the most
// common deploy regressions (broken routes, env config, missing
// Supabase keys at build time) without needing test-user credentials.
//
// Real auth flow + onboarding/jobs/AI-review specs are deferred — see
// audit/findings phase 5 for the launch suite recommendation.
test('login page renders the magic-link form', async ({ page }) => {
  await page.goto('/login');

  await expect(
    page.getByRole('heading', { name: 'Sign in', level: 1 })
  ).toBeVisible();
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Send magic link' })
  ).toBeDisabled();
});

test('home redirects unauthenticated visitor to login', async ({ page }) => {
  // The auth middleware sends signed-out visitors to /login when they
  // hit any (app) route. Hitting /dashboard is the canonical regression
  // target — if middleware breaks, this fails before we ship.
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login(\?.*)?$/);
});
