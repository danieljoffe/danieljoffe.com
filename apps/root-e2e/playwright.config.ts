import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env.BASE_URL || 'http://localhost:3000';
const isCI = process.env.CI === 'true';
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  reporter: [
    ['line'],
    ['json', { outputFile: 'playwright-report-json/report.json' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    /* Record video on failure */
    video: 'retain-on-failure',
    /* Global timeout for each action */
    actionTimeout: 10000,
    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },
  /* Global test timeout */
  timeout: isCI ? 45000 : 30000, // Longer timeout in CI
  /* Expect timeout */
  expect: {
    timeout: isCI ? 15000 : 10000, // Longer expect timeout in CI
  },
  /* Retry failed tests */
  retries: isCI ? 2 : 0,
  /* Parallel execution */
  ...(isCI ? { workers: 2 } : {}),
  /* Run your local dev server before starting the tests.
   * When running via Nx (npx nx e2e root-e2e), Nx handles build→start→e2e
   * and Playwright reuses the running server. This command is a fallback
   * for direct Playwright invocation (npx playwright test). */
  webServer: {
    command:
      'npx nx run @danieljoffe.com/root:build && npx nx run @danieljoffe.com/root:start',
    url: 'http://localhost:3000',
    reuseExistingServer: true, // Allow reuse to avoid port conflicts
    cwd: workspaceRoot,
    timeout: isCI ? 180000 : 120000, // 3 min CI, 2 min locally (includes build)
    env: {
      // Enable font mocking at BUILD time — replaces Google Fonts with system fonts
      // via webpack NormalModuleReplacementPlugin in next.config.js.
      // In CI, CI=true triggers this automatically; MOCK_FONTS is for local use.
      MOCK_FONTS: 'true',
      // Use hCaptcha test sitekey (always passes verification)
      NEXT_PUBLIC_HCAPTCHA_SITE_ID: '10000000-ffff-ffff-ffff-000000000001',
      // Disable Sentry to speed up startup
      ...(isCI && {
        SENTRY_DSN: '',
        SENTRY_AUTH_TOKEN: '',
      }),
      // Disable analytics and other non-essential services
      ...(isCI && {
        NEXT_TELEMETRY_DISABLED: '1',
        ANALYZE: 'false',
      }),
    },
  },
  /* Where to put artifacts like screenshots, videos, traces and the JSON report */
  outputDir: 'playwright-report-json',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      retries: 2, // Firefox can be flaky in headless mode
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      retries: 2, // WebKit is flaky in headless mode
    },
    // Mobile viewports — local only (slowest, most flaky)
    ...(!isCI
      ? [
          {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
          },
          {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
            retries: 2, // WebKit-based, can be flaky
          },
        ]
      : []),
  ],
});
