// Ensure NODE_ENV=test so react-dom/test-utils loads the development build
// (the production build removed React.act in React 19).
process.env.NODE_ENV = 'test';

const isCI = process.env.CI === 'true';

export default {
  displayName: '@danieljoffe.com/shared-ui',
  // Stop at first test failure in CI for fast feedback
  bail: isCI ? 1 : 0,
  preset: '../../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
    '^.+\\.[tj]sx?$': ['babel-jest', { presets: ['@nx/react/babel'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^focus-trap-react$': '<rootDir>/src/__mocks__/focus-trap-react.tsx',
  },
  coverageDirectory: 'test-output/jest/coverage',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};
