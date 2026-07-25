const nextJest = require('next/jest.js').default ?? require('next/jest.js');

// Ensure NODE_ENV=test so react-dom/test-utils loads the development build
// (the production build removed React.act in React 19, causing flaky failures).
process.env.NODE_ENV = 'test';

const createJestConfig = nextJest({
  dir: './',
});

const isCI = process.env.CI === 'true';

const config = {
  displayName: '@danieljoffe.com/root',
  // Stop at first test failure in CI for fast feedback
  bail: isCI ? 1 : 0,
  preset: '../../jest.preset.js',
  transform: {
    // Custom MDX transform — extracts `export const metadata` and stubs the
    // default React component. See __mocks__/mdxTransform.js for the why.
    '\\.mdx$': '<rootDir>/__mocks__/mdxTransform.js',
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mdx'],
  coverageDirectory: '../../coverage/apps/root',
  testEnvironment: 'jsdom',
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 65,
      lines: 65,
      statements: 65,
    },
  },
  // Ensure Jest exits cleanly in Nx/Next test envs
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    // Map the published scope to library SOURCE, not the built dist a stale
    // node_modules symlink would serve — app tests must exercise the same
    // shared-ui code the repo ships from.
    '^@danieljoffe/shared-ui$': '<rootDir>/../../libs/shared/ui/src/index.ts',
    '^@danieljoffe/shared-ui/styles/(.*)$':
      '<rootDir>/../../libs/shared/ui/src/lib/styles/$1.ts',
    '^@danieljoffe/shared-ui/(.*)$':
      '<rootDir>/../../libs/shared/ui/src/lib/$1.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};

module.exports = createJestConfig(config);
