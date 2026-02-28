export const LIGHTHOUSE_CONFIG = {
  output: 'json' as const,
  logLevel: 'error' as const,
  onlyCategories: [
    'performance',
    'accessibility',
    'best-practices',
    'seo',
  ] as string[],
  formFactor: 'mobile' as const,
  throttling: {
    cpuSlowdownMultiplier: 1,
    downloadThroughputKbps: 1600,
    uploadThroughputKbps: 750,
    rttMs: 150,
    throughputKbps: 1600,
  },
  screenEmulation: {
    mobile: true,
    width: 375,
    height: 812,
    deviceScaleFactor: 3,
    disabled: false,
  },
  chromeFlags: [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-extensions',
    '--disable-background-networking',
  ],
};

export const LIGHTHOUSE_DESKTOP_CONFIG = {
  ...LIGHTHOUSE_CONFIG,
  formFactor: 'desktop' as const,
  throttling: {
    cpuSlowdownMultiplier: 1,
    downloadThroughputKbps: 10240,
    uploadThroughputKbps: 10240,
    rttMs: 40,
    throughputKbps: 10240,
  },
  screenEmulation: {
    mobile: false,
    width: 1350,
    height: 940,
    deviceScaleFactor: 1,
    disabled: false,
  },
};
