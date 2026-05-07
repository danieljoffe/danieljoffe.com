import nx from '@nx/eslint-plugin';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: [
      '**/dist',
      '**/out-tsc',
      '**/vite.config.*.timestamp*',
      '**/vitest.config.*.timestamp*',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            // === TYPE CONSTRAINTS ===
            // Apps can depend on any library type
            {
              sourceTag: 'type:app',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:lib',
                'type:util',
                'type:data-access',
                'type:feature',
              ],
            },
            // E2E projects can only depend on apps (not libraries directly)
            {
              sourceTag: 'type:e2e',
              onlyDependOnLibsWithTags: ['type:app'],
            },
            // UI libraries should only depend on other UI or utility libraries
            {
              sourceTag: 'type:ui',
              onlyDependOnLibsWithTags: ['type:ui', 'type:util'],
            },
            // General libraries should only depend on other libraries or utilities
            {
              sourceTag: 'type:lib',
              onlyDependOnLibsWithTags: ['type:lib', 'type:util'],
            },
            // Utility libraries should only depend on other utilities
            {
              sourceTag: 'type:util',
              onlyDependOnLibsWithTags: ['type:util'],
            },
            // Feature libraries can depend on UI, data-access, and utilities
            {
              sourceTag: 'type:feature',
              onlyDependOnLibsWithTags: [
                'type:ui',
                'type:data-access',
                'type:util',
              ],
            },
            // Data-access libraries should only depend on utilities
            {
              sourceTag: 'type:data-access',
              onlyDependOnLibsWithTags: ['type:util', 'type:data-access'],
            },
            // === SCOPE CONSTRAINTS ===
            // App-scoped projects can use shared libs but not other app scopes
            {
              sourceTag: 'scope:root',
              onlyDependOnLibsWithTags: ['scope:root', 'scope:shared'],
            },
            // Audit-scoped projects can use audit and shared libs
            {
              sourceTag: 'scope:audit',
              onlyDependOnLibsWithTags: ['scope:audit', 'scope:shared'],
            },
            // WyrdFold-scoped projects can use shared libs but not other app scopes
            {
              sourceTag: 'scope:wyrdfold',
              onlyDependOnLibsWithTags: ['scope:wyrdfold', 'scope:shared'],
            },
            // Shared libraries should only depend on other shared libraries
            {
              sourceTag: 'scope:shared',
              onlyDependOnLibsWithTags: ['scope:shared'],
            },
          ],
        },
      ],
    },
  },
  // Base rules for all files
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    // Stricter rules for better code quality
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-inferrable-types': 'error',

      // General JavaScript/TypeScript rules
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-expressions': 'error',
      'no-useless-return': 'error',
      'no-useless-escape': 'error',
      'prefer-template': 'error',
      'object-shorthand': 'error',
      'prefer-arrow-callback': 'error',
    },
  }
);
