import '@testing-library/jest-dom';

// Suppress noisy console output during tests (e.g. ErrorBoundary logs).
// Tests that need to assert on console calls can still spy on these.
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});
