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
  coverageDirectory: 'test-output/jest/coverage',
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
};
