// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import baseConfig from '../../eslint.config.mjs';

// eslint-config-next bundles its own typescript-eslint instance (8.54.0) which
// conflicts with the one from @nx/eslint-plugin (8.55.0). Strip the Next.js
// copy so Nx provides the single canonical @typescript-eslint plugin.
const nextConfigs = nextCoreWebVitals.map((cfg) => {
  if (!cfg.plugins?.['@typescript-eslint']) return cfg;
  const { '@typescript-eslint': _removed, ...keepPlugins } = cfg.plugins;
  return { ...cfg, plugins: keepPlugins };
});

const config = [
  ...nextConfigs,
  ...baseConfig,
  {
    ignores: [
      '*.d.ts',
      '.next/**/*',
      'dist/**/*',
      'node_modules/**/*',
      'coverage/**/*',
      'storybook-static',
      '.env*',
    ],
  },
  ...storybook.configs['flat/recommended'],
];

export default config;
