// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import reactPlugin from 'eslint-plugin-react';
import { fixupPluginRules } from '@eslint/compat';
import baseConfig from '../../eslint.config.mjs';
import requireButtonName from './eslint-rules/require-button-name.js';

// eslint-config-next bundles its own typescript-eslint instance (conflicts with the
// Nx-managed version) and an eslint-plugin-react instance that uses deprecated
// context APIs removed in ESLint 10. Strip both and provide compatible versions.
const nextConfigs = nextCoreWebVitals.map(cfg => {
  if (!cfg.plugins) return cfg;
  const {
    '@typescript-eslint': _ts,
    react: _react,
    ...keepPlugins
  } = cfg.plugins;
  return {
    ...cfg,
    plugins: {
      ...keepPlugins,
      // Wrap eslint-plugin-react with the ESLint 10 compatibility shim so its
      // deprecated context.getFilename() calls are bridged to context.filename.
      react: fixupPluginRules(reactPlugin),
    },
  };
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
  {
    files: ['**/*.tsx'],
    ignores: ['**/*.stories.tsx'],
    plugins: {
      'custom-rules': {
        rules: {
          'require-button-name': requireButtonName,
        },
      },
    },
    rules: {
      'custom-rules/require-button-name': 'warn',
    },
  },
];

export default config;
