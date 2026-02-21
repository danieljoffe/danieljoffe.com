const isNotDev = process.env.NODE_ENV !== 'development';
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

/**
 * @type {import('lighthouse').Config}
 */
const config = {
  ci: {
    collect: {
      extends: 'lighthouse:default',
      url: [
        baseUrl,
        `${baseUrl}/about`,
        `${baseUrl}/experience/winc`,
        `${baseUrl}/experience/professional-development`,
        `${baseUrl}/projects`,
        `${baseUrl}/services`,
      ],
      numberOfRuns: 3,
      // Ensure server is properly stopped after collection
      settings: {
        chromeFlags: isNotDev
          ? ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
          : [],
      },
      ...(isNotDev
        ? {}
        : {
            startServerCommand: 'npx nx run @danieljoffe.com/root:start',
            startServerReadyPattern: 'ready - started server on',
            startServerReadyTimeout: 30000,
          }),
    },
    assert: {
      assertions: {
        'largest-contentful-paint': ['warn', { maxNumericValue: 5000 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'categories:best-practices': ['error', { minScore: 0.85 }],
        'categories:performance': ['warn', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.85 }],
        'categories:seo': ['error', { minScore: 0.85 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.25 }],
        'total-blocking-time': ['warn', { maxNumericValue: 400 }],
        'speed-index': ['warn', { maxNumericValue: 3500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

module.exports = config;
