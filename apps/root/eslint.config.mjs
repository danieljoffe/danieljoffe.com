// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import reactPlugin from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import { fixupPluginRules } from '@eslint/compat';
import baseConfig from '../../eslint.config.mjs';
import requireButtonName from './eslint-rules/require-button-name.js';

// eslint-config-next bundles its own typescript-eslint, eslint-plugin-react, and
// eslint-plugin-import instances. typescript-eslint conflicts with the Nx-managed
// version, and the react + import plugins use deprecated context APIs removed in
// ESLint 10. Strip all three and provide compatible versions.
const nextConfigs = nextCoreWebVitals.map(cfg => {
  if (!cfg.plugins) return cfg;
  const {
    '@typescript-eslint': _ts,
    react: _react,
    import: _import,
    ...keepPlugins
  } = cfg.plugins;
  return {
    ...cfg,
    plugins: {
      ...keepPlugins,
      react: fixupPluginRules(reactPlugin),
      import: fixupPluginRules(importPlugin),
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
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    settings: {
      'import/internal-regex': '^@/',
    },
    rules: {
      // Import ordering: node → packages → lib imports → local files
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          pathGroups: [
            {
              pattern: '@danieljoffe.com/**',
              group: 'external',
              position: 'after',
            },
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'never',
        },
      ],
      'import/no-cycle': 'error',
      'import/no-duplicates': 'error',
    },
  },
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
