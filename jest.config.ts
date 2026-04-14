const { getJestProjectsAsync } = require('@nx/jest');

module.exports = async () => ({
  projects: await getJestProjectsAsync(),
  moduleNameMapper: {
    '^next/navigation$': '<rootDir>/__mocks__/next.navigation.js',
    'global.IntersectionObserver': '<rootDir>/__mocks__/genericObserver.js',
    'global.ResizeObserver': '<rootDir>/__mocks__/genericObserver.js',
    'global.window': '<rootDir>/__mocks__/window.js',
  },
  verbose: true,
  transformIgnorePatterns: [],
});
