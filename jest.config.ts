import type { Config } from 'jest';
import { getJestProjectsAsync } from '@nx/jest';

export default async (): Promise<Config> => ({
  projects: await getJestProjectsAsync(),
  moduleNameMapper: {
    '^next/navigation$': '<rootDir>/__mocks__/next.navigation.js',
    'global.IntersectionObserver': '<rootDir>/__mocks__/genericObserver.js',
    'global.ResizeObserver': '<rootDir>/__mocks__/genericObserver.js',
    'global.window': '<rootDir>/__mocks__/window.js',
  },
  verbose: true,
  transformIgnorePatterns: ['node_modules/(?!(gsap|next-transition-router)/)'],
});
