import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// Wyrdfold dev server runs on :3100 to avoid colliding with `apps/root`
// (which owns :3000). With `reuseExistingServer: true`, a stale root
// process on :3000 would silently absorb every spec — we'd be testing
// the wrong app. Pinning a distinct port makes that mistake impossible.
const PORT = process.env['PORT'] || '3100';
const baseURL = process.env['BASE_URL'] || `http://localhost:${PORT}`;

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
  // CI-Chromium-only matches root-e2e and avoids 90% noise from running
  // Firefox + WebKit headless against an auth+SSE stack with zero specs.
  projects: process.env['CI']
    ? [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
    : [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
        { name: 'webkit', use: { ...devices['Desktop Safari'] } },
      ],
});
