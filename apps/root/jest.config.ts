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
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  // Ensure Jest exits cleanly in Nx/Next test envs
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '^@danieljoffe\\.com/shared-ui$':
      '<rootDir>/../../libs/shared/ui/src/index.ts',
    '^@danieljoffe\\.com/shared-ui/styles/(.*)$':
      '<rootDir>/../../libs/shared/ui/src/lib/styles/$1.ts',
    '^@danieljoffe\\.com/shared-ui/(.*)$':
      '<rootDir>/../../libs/shared/ui/src/lib/$1.tsx',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^gsap/MorphSVGPlugin$': '<rootDir>/__mocks__/gsap.morphSVGPlugin.js',
    '^gsap/CustomEase$': '<rootDir>/__mocks__/gsap.customEase.js',
    '^gsap/CustomWiggle$': '<rootDir>/__mocks__/gsap.customWiggle.js',
    '^gsap/MotionPathPlugin$': '<rootDir>/__mocks__/gsap.motionPathPlugin.js',
  },
};

module.exports = createJestConfig(config);
