'use strict';

const requireButtonName = require('./rules/require-button-name');
const noRawHeadings = require('./rules/no-raw-headings');
const preferPrimitives = require('./rules/prefer-primitives');

const { version } = require('./package.json');

/**
 * ESLint plugin exposing the design-system rules, plus a `recommended` flat
 * config preset. Consumers register the plugin and rules, e.g.:
 *
 *   import danieljoffe from '@danieljoffe/eslint-config';
 *   export default [...danieljoffe.configs.recommended];
 */
const plugin = {
  meta: { name: '@danieljoffe/eslint-config', version },
  rules: {
    'require-button-name': requireButtonName,
    'no-raw-headings': noRawHeadings,
    'prefer-primitives': preferPrimitives,
  },
  configs: {},
};

plugin.configs.recommended = [
  {
    plugins: { '@danieljoffe': plugin },
    rules: {
      '@danieljoffe/require-button-name': 'warn',
      '@danieljoffe/no-raw-headings': 'warn',
      '@danieljoffe/prefer-primitives': 'warn',
    },
  },
];

module.exports = plugin;
