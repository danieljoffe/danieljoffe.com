import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Wyrdfold dev server runs on :3100 to avoid colliding with `apps/root`
// (which owns :3000). With `reuseExistingServer: true`, a stale root
// process on :3000 would silently absorb every spec — we'd be testing
// the wrong app. Pinning a distinct port makes that mistake impossible.
const PORT = process.env['PORT'] || '3100';
const baseURL = process.env['BASE_URL'] || `http://localhost:${PORT}`;

// Playwright transforms this config as CJS so ``__dirname`` is
// available directly. Nx's project-graph parser inspects the config
// in a context where ``node:path`` doesn't resolve cleanly, so just
// build the path as a string — same result, no import.
const AUTH_STORAGE = `${__dirname}/src/.auth/user.json`;

// Auth-fixture availability gate. If the four required env vars aren't
// set the ``setup`` spec ``test.skip``s, which leaves the storageState
// file uncreated — and downstream ``authed-chromium`` then crashes on
// ENOENT trying to load it. Detect that here and just omit the authed
// project entirely. Public specs still run; authed specs report as
// "not run" rather than "failed."
const AUTH_ENABLED =
  !!process.env['NEXT_PUBLIC_SUPABASE_URL'] &&
  !!process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] &&
  !!process.env['E2E_TEST_USER_EMAIL'] &&
  !!process.env['E2E_TEST_USER_PASSWORD'];

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `PORT=${PORT} pnpm exec nx run wyrdfold:dev`,
    url: baseURL,
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    // proxy.ts hard-401s when these are absent. The smoke specs run with no
    // auth cookie, so getUser() returns null without ever calling out to the
    // dummy URL — the values just need to be present strings. Real Supabase
    // creds stay in Vercel/CI secrets for environments that exercise auth.
    env: {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? 'http://127.0.0.1:0',
      NEXT_PUBLIC_SUPABASE_ANON_ID:
        process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] ?? 'e2e-placeholder',
    },
  },
  // Project layout:
  //   - ``public-chromium`` — un-authed specs (login form, middleware
  //     redirects). No setup dependency, runs in CI even without
  //     E2E_TEST_USER_* secrets.
  //   - ``setup`` — runs auth.setup.ts once, writes the storageState
  //     used by every authed project. ``setup.skip`` when env vars
  //     are absent → no failure, downstream specs just don't run.
  //   - ``authed-chromium`` — specs that need a signed-in session
  //     (onboarding, jobs, targets, profile). Uses storageState from
  //     ``setup``. ``dependencies: ['setup']`` chains it.
  //
  // Local-only (non-CI) keeps Firefox + WebKit on the public set to
  // catch cross-browser regressions in the auth-free chrome; authed
  // specs stay Chromium-only to avoid 3x LLM-cost amplification when
  // those start running real flows.
  projects: [
    {
      name: 'public-chromium',
      testIgnore: /(auth\.setup|onboarding|authed-.*)\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // Setup + authed projects only register when the auth env is
    // available. Otherwise they wouldn't add value and ``authed-chromium``
    // would crash on a missing storageState.
    ...(AUTH_ENABLED
      ? [
          {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Chrome'] },
          },
          {
            name: 'authed-chromium',
            // Add new authed-spec filenames here as the suite grows.
            testMatch: /onboarding\.spec\.ts/,
            use: {
              ...devices['Desktop Chrome'],
              storageState: AUTH_STORAGE,
            },
            dependencies: ['setup'],
          },
        ]
      : []),
    ...(process.env['CI']
      ? []
      : [
          {
            name: 'public-firefox',
            testIgnore: /(auth\.setup|onboarding|authed-.*)\.spec\.ts/,
            use: { ...devices['Desktop Firefox'] },
          },
          {
            name: 'public-webkit',
            testIgnore: /(auth\.setup|onboarding|authed-.*)\.spec\.ts/,
            use: { ...devices['Desktop Safari'] },
          },
        ]),
  ],
});
