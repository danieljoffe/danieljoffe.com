import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

const dirname =
  typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// The visual-regression project is opt-in via VITEST_VISUAL=true so it runs
// only where we want it (the CI visual job), not in every `test-storybook` run.
// Baselines are platform-specific and committed only for Linux (generated in
// CI) — see the visual-baselines workflow. Self-hosted replacement for Chromatic.
const visualEnabled = process.env.VITEST_VISUAL === 'true';

const browserBase = {
  enabled: true,
  headless: true,
  provider: playwright({}),
  instances: [{ browser: 'chromium' }],
} as const;

// https://storybook.js.org/docs/writing-tests/integrations/vitest-addon
export default defineConfig({
  test: {
    watch: false,
    projects: [
      {
        extends: true,
        plugins: [
          react(),
          storybookTest({ configDir: path.join(dirname, '.storybook') }),
        ],
        test: {
          name: 'storybook',
          browser: { ...browserBase },
          setupFiles: ['.storybook/vitest.setup.ts'],
        },
      },
      ...(visualEnabled
        ? [
            {
              extends: true as const,
              plugins: [react()],
              test: {
                name: 'visual',
                // `.visual.tsx` (not `.test`/`.spec`) so Jest's unit runner
                // ignores these browser-only screenshot tests.
                include: ['src/**/*.visual.{ts,tsx}'],
                setupFiles: ['.storybook/vitest.setup.ts'],
                browser: {
                  ...browserBase,
                  // Desktop viewport so responsive classes (`sm:`/`md:`/`lg:`)
                  // render predictably — e.g. Kbd is `hidden sm:inline-flex`,
                  // invisible at the default mobile width.
                  viewport: { width: 1280, height: 720 },
                  expect: {
                    toMatchScreenshot: {
                      comparatorName: 'pixelmatch' as const,
                      comparatorOptions: {
                        // Tolerate sub-pixel antialiasing noise; flag real changes.
                        threshold: 0.2,
                        allowedMismatchedPixelRatio: 0.01,
                      },
                    },
                  },
                },
              },
            },
          ]
        : []),
    ],
  },
});
