import { test, expect } from '@playwright/test';

/**
 * Catch-all smoke for the top-level authenticated routes. Each route
 * is hit fresh, asserted to stay off ``/login`` (middleware regression
 * guard) and asserted to render an ``<h1>`` (renders-at-all guard).
 *
 * Doesn't assert specific heading copy — that's brittle to design
 * tweaks and the existing onboarding.spec.ts already covers the
 * Dashboard chrome with named assertions. This spec's job is the
 * boring one: "every authed route returns 200 and hydrates."
 *
 * What this catches:
 *   - ``fetchJsonFromWyrdfoldAPI`` SSR regression that bricks one
 *     route while leaving the others intact (would not be caught
 *     by /dashboard alone).
 *   - Middleware accidentally redirecting an authed route to /login
 *     for the signed-in user (cookie-shape drift, role-check bug).
 *   - Build-output regression where a single route page chunk is
 *     missing or fails to hydrate.
 *
 * Routes intentionally exclude resource-id-scoped paths
 * (``/jobs/[id]``, ``/targets/[id]``) — those need seeded data and
 * belong in feature-specific specs that own their setup.
 */
const TOP_LEVEL_AUTHED_ROUTES = [
  '/dashboard',
  '/jobs',
  '/targets',
  '/profile',
  '/insights',
  '/settings',
] as const;

test.describe('authenticated top-level routes smoke', () => {
  for (const route of TOP_LEVEL_AUTHED_ROUTES) {
    test(`${route} renders an h1 without redirecting to /login`, async ({
      page,
    }) => {
      await page.goto(route);

      // Middleware regression guard. If the cookie shape drifted or
      // the SSR session decode broke, the route would redirect here
      // and the page would silently "render" as the login form.
      await expect(page).not.toHaveURL(/\/login/);

      // Render guard. Each top-level page uses ``<Heading as='h1'>``
      // from the kit; assert one exists rather than matching copy
      // (resistant to design / wording tweaks).
      await expect(
        page.getByRole('heading', { level: 1 }).first()
      ).toBeVisible();
    });
  }
});
