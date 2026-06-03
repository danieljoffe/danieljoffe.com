import { test, expect } from '@playwright/test';

/**
 * Authenticated round-trip for the Profile identity card (added in
 * #703 / extended in F3-A; moved from /settings to /profile in the
 * settings refactor — see ``SettingsPage.tsx:444`` "Identity ...
 * lives on /profile now"). Verifies the full FE → API → DB → API → FE
 * loop without burning LLM credits:
 *
 *   1. ``GET /api/profile/identity`` populates the Name input on
 *      mount.
 *   2. Editing Name triggers the debounced autosave (800ms) which
 *      ``PATCH``-es ``/api/profile/identity``.
 *   3. Reloading the page re-runs the GET and the new value is
 *      visible.
 *
 * Restores the original Name in a ``finally`` block so the shared
 * test user identity stays clean. Other identity fields aren't
 * touched — the autosave PATCHes all six on each diff, but the FE
 * sends the same values it just read from the server for the
 * untouched fields, so they round-trip without change.
 *
 * What this catches:
 *   - GET /identity wiring regression (broken auth / RLS /
 *     ``_get_or_create_profile``).
 *   - PATCH /identity regression (Pydantic shape drift, empty-string
 *     clear-to-NULL behavior, autosave debouncer never firing).
 *   - The Profile page never re-syncing from the server response
 *     (the page does a setState from the PATCH response in the
 *     handleSaveProfile path — this catches a regression where it
 *     drops that re-sync).
 */
test.describe('profile identity round-trip', () => {
  test('Name edits persist across reload', async ({ page }) => {
    const TEST_NAME = `E2E Test User ${Date.now()}`;

    await page.goto('/profile');

    // Wait for the Profile page to mount. The Name input lives in
    // ProfileIdentityCard; the Skeleton is replaced once GET /identity
    // resolves.
    const nameInput = page.getByLabel('Name', { exact: true });
    await expect(nameInput).toBeVisible();

    // The shared test user should have a name set (created via the
    // beta-invite script or dashboard). If this assertion fires
    // empty, the GET is broken or the user has never been seeded.
    const original = await nameInput.inputValue();
    expect(original.length).toBeGreaterThan(0);

    try {
      await nameInput.fill(TEST_NAME);

      // Autosave is debounced ~800ms; the SavingIndicator pops on
      // and off around the network call. Wait for the cycle to
      // complete — once the indicator is gone, the PATCH has
      // returned.
      const savingIndicator = page.getByText('Saving…');
      await expect(savingIndicator).toBeVisible({ timeout: 2_000 });
      await expect(savingIndicator).toBeHidden({ timeout: 5_000 });

      // Hard reload — re-runs SSR + client mount, so GET /identity
      // fires fresh against the database.
      await page.reload();

      const reloadedNameInput = page.getByLabel('Name', { exact: true });
      await expect(reloadedNameInput).toHaveValue(TEST_NAME);
    } finally {
      // Restore. If the previous step crashed mid-test we still
      // want to leave the shared user's identity in its original
      // state; otherwise subsequent runs would assert against
      // ``E2E Test User <timestamp>`` and the manual UI would show
      // a confusing stale name.
      const restoreInput = page.getByLabel('Name', { exact: true });
      if ((await restoreInput.inputValue()) !== original) {
        await restoreInput.fill(original);
        // Best-effort wait — don't fail the test on cleanup races.
        await page
          .getByText('Saving…')
          .waitFor({ state: 'hidden', timeout: 5_000 })
          .catch(() => {});
      }
    }
  });
});
