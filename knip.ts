import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  workspaces: {
    // -----------------------------------------------------------------
    // Root workspace (scripts, configs)
    // -----------------------------------------------------------------
    '.': {
      entry: ['scripts/*.ts'],
      project: ['scripts/**/*.ts'],
      // Root jest.config delegates to Nx projects; disable to avoid
      // Next.js pages-dir lookup error at workspace root
      jest: false,
      ignoreDependencies: [
        // Tailwind v4 uses @import in CSS, not JS imports
        'tailwindcss',
        '@tailwindcss/typography',
        // caniuse-lite is required by browserslist (package.json config)
        'caniuse-lite',
      ],
    },

    // -----------------------------------------------------------------
    // apps/root — Next.js 16 application
    // -----------------------------------------------------------------
    'apps/root': {
      entry: [
        'src/app/**/page.tsx',
        'src/app/**/layout.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/app/**/global-error.tsx',
        'src/app/**/route.ts',
        'src/app/api/**/route.ts',
        'src/app/**/opengraph-image.tsx',
        // Jest setup file referenced via config, not imports
        'src/test-setup.ts',
      ],
      project: ['src/**/*.{ts,tsx}'],
      ignoreDependencies: [
        // webpack is a Next.js transitive dep, referenced in next.config.mjs
        'webpack',
      ],
    },

    // -----------------------------------------------------------------
    // apps/root-e2e — Playwright E2E tests
    // -----------------------------------------------------------------
    'apps/root-e2e': {
      entry: ['src/**/*.spec.ts'],
      project: ['src/**/*.ts'],
    },

    // -----------------------------------------------------------------
    // apps/audit-scan-service — Express service
    // -----------------------------------------------------------------
    'apps/audit-scan-service': {
      entry: ['src/main.ts'],
      project: ['src/**/*.ts'],
    },

    // -----------------------------------------------------------------
    // libs/shared/ui — React component library
    // -----------------------------------------------------------------
    'libs/shared/ui': {
      entry: [
        // Jest setup file referenced via config, not imports
        'src/test-setup.ts',
      ],
      project: ['src/**/*.{ts,tsx}'],
    },

    // -----------------------------------------------------------------
    // libs/shared/audit — Shared audit types
    // -----------------------------------------------------------------
    'libs/shared/audit': {
      entry: [
        // Generated Supabase types, not imported but kept for reference
        'src/lib/database.types.ts',
      ],
      project: ['src/**/*.ts'],
    },
  },
};

export default config;
