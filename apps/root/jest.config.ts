import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  displayName: '@danieljoffe.com/root',
  preset: '../../jest.preset.js',
  transform: {
    '^(?!.*\\.(js|jsx|ts|tsx|css|json)$)': '@nx/react/plugins/jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
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
      branches: 23.5,
      functions: 24.4,
      lines: 25,
      statements: 25,
    },
  },
  // Ensure Jest exits cleanly in Nx/Next test envs
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^next-transition-router$': '<rootDir>/__mocks__/next-transition-router.js',
    '^gsap/MorphSVGPlugin$': '<rootDir>/__mocks__/gsap.morphSVGPlugin.js',
    '^gsap/CustomEase$': '<rootDir>/__mocks__/gsap.customEase.js',
    '^gsap/CustomWiggle$': '<rootDir>/__mocks__/gsap.customWiggle.js',
    '^gsap/MotionPathPlugin$': '<rootDir>/__mocks__/gsap.motionPathPlugin.js',
  },
};

export default createJestConfig(config);
