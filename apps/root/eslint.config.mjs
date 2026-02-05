// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';
import nextConfig from 'eslint-config-next';
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

const config = [
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nx.configs['flat/react-typescript'],
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
