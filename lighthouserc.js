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
      settings: {
        chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
      },
      startServerCommand: 'npx nx start root --prod',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 60000,
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
