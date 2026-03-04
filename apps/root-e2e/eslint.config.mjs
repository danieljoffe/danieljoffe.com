import playwright from 'eslint-plugin-playwright';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.ts', '**/*.js'],
    plugins: {
      playwright,
    },
    rules: {
      ...playwright.configs.recommended.rules,
      // Disable conditional rules that are causing issues
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      // Enable other useful Playwright rules
      'playwright/expect-expect': [
        'error',
        { assertFunctionNames: ['expect', 'expectNoA11yViolations'] },
      ],
      'playwright/no-page-pause': 'error',
      'playwright/no-restricted-matchers': 'error',
      'playwright/prefer-lowercase-title': 'warn',
      'playwright/prefer-strict-equal': 'error',
      'playwright/valid-expect': 'error',
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
      'playwright/no-wait-for-timeout': 'warn',
    },
    ignores: ['playwright-report-json'],
  },
];
