import { test as base, expect, Page, Route } from '@playwright/test';

// Re-export test data for convenience
export {
  NAV_LINKS,
  PROJECT_SLUGS,
  EXPERIENCE_SLUGS,
  VALID_FORM_DATA,
  INVALID_FORM_DATA,
} from './test-data';

// Custom fixture types
type CustomFixtures = {
  mobileViewport: Page;
  desktopViewport: Page;
};

// Extend base test with custom fixtures
export const test = base.extend<CustomFixtures>({
  // Mobile viewport fixture (iPhone-like)
  mobileViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await use(page);
  },

  // Desktop viewport fixture
  desktopViewport: async ({ page }, use) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await use(page);
  },
});

// Helper function to mock hCaptcha
export async function mockHCaptcha(page: Page): Promise<void> {
  await page.route('**/hcaptcha.com/**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.hcaptcha = {
          render: function() { return 'mock-widget-id'; },
          execute: function() { return Promise.resolve('mock-token'); },
          getResponse: function() { return 'mock-token'; },
          reset: function() {}
        };
      `,
    });
  });
}

// Helper function to mock API email endpoint for success
export async function mockEmailAPISuccess(page: Page): Promise<void> {
  await page.route('**/api/email', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        success: true,
        body: { data: {}, message: 'Email sent successfully' },
      }),
    });
  });
}

// Helper function to mock API email endpoint for error
export async function mockEmailAPIError(page: Page): Promise<void> {
  await page.route('**/api/email', async (route: Route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 500,
        success: false,
        body: { message: 'Server error' },
      }),
    });
  });
}

// Re-export expect for convenience
export { expect };
