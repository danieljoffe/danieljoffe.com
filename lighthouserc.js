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
      ],
      // numberOfRuns: 3,
      numberOfRuns: 1,
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
      // only warn about issues
      assertions: {
        'largest-contentful-paint': ['warn', { maxNumericValue: 6000 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 3000 }],
        'categories:best-practices': ['warn', { minScore: 0.75 }],
        'categories:performance': ['warn', { minScore: 0.75 }],
        'categories:accessibility': ['warn', { minScore: 0.75 }],
        'categories:seo': ['warn', { minScore: 0.75 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.5 }],
        'total-blocking-time': ['warn', { maxNumericValue: 500 }],
        'speed-index': ['warn', { maxNumericValue: 4000 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};

module.exports = config;
