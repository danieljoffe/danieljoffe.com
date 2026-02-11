import { Page, Route } from '@playwright/test';

// Helper function to mock hCaptcha
export async function mockHCaptcha(page: Page): Promise<void> {
  // Intercept all hCaptcha network requests to prevent loading the real widget
  await page.route('**/hcaptcha.com/**', async (route: Route) => {
    const url = route.request().url();
    if (url.endsWith('.js') || url.includes('api.js')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: '/* hcaptcha mocked */',
      });
    } else {
      await route.fulfill({ status: 200, body: '' });
    }
  });

  // Inject mock hCaptcha object before any page JS executes.
  // The @hcaptcha/react-hcaptcha component calls window.hcaptcha.render(el, opts)
  // where opts.callback is the onVerify handler. We capture it and auto-call it.
  // A data attribute on <html> signals when the callback has fired.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'hcaptcha', {
      value: {
        render: (
          _container: unknown,
          opts?: { callback?: (token: string) => void }
        ) => {
          // Auto-verify: use requestAnimationFrame to ensure the callback
          // fires after the component has fully mounted. Then set the DOM
          // attribute to signal completion to the test harness.
          if (opts?.callback) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                opts.callback!('mock-hcaptcha-token');
                document.documentElement.setAttribute(
                  'data-hcaptcha-verified',
                  'true'
                );
              });
            });
          }
          return 'mock-widget-id';
        },
        execute: () => Promise.resolve({ response: 'mock-hcaptcha-token' }),
        getResponse: () => 'mock-hcaptcha-token',
        getRespKey: () => 'mock-resp-key',
        reset: () => {},
        remove: () => {},
      },
      writable: true,
      configurable: true,
    });
  });
}

// Helper to complete hCaptcha by scrolling the captcha container into view
// to trigger IntersectionObserver → dynamic import → component mount →
// window.hcaptcha.render() → auto-verify callback → setValue('hcaptcha', token).
// Waits for the data-hcaptcha-verified attribute set by the mock callback.
export async function completeHCaptcha(page: Page): Promise<void> {
  // Scroll to the captcha container to trigger IntersectionObserver lazy-load
  const captchaContainer = page.locator('.min-h-\\[78px\\]');
  await captchaContainer.scrollIntoViewIfNeeded();

  // Wait for the mock hCaptcha render callback to fire and signal via DOM attribute.
  // The chain is: IntersectionObserver → dynamic import → componentDidMount →
  // hcaptcha.render() → setTimeout(50ms) → callback('mock-token') → setAttribute.
  await page.waitForFunction(
    () =>
      document.documentElement.getAttribute('data-hcaptcha-verified') ===
      'true',
    null,
    { timeout: 10000 }
  );

  // Wait for React to process the setValue('hcaptcha', token) state update.
  // On webkit, the state flush may not be complete by the time the next
  // Playwright action fires. Use requestAnimationFrame + microtask to ensure
  // React has flushed the update across all browser engines.
  await page.evaluate(
    () =>
      new Promise<void>(resolve => {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      })
  );
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

/**
 * Wait for React hydration to complete on the current page.
 * Detects hydration by waiting for Next.js to set up its client-side router,
 * which only happens after React has finished hydrating.
 * Use this before interacting with forms or other client-side features.
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  // Next.js sets __next_f on the window during hydration. Wait for it,
  // then yield a frame to ensure React event handlers are attached.
  await page.waitForFunction(
    () =>
      typeof (window as unknown as Record<string, unknown>).__next_f !==
      'undefined',
    null,
    { timeout: 15000 }
  );
  // Yield two animation frames to let React finalize event handler attachment
  await page.evaluate(
    () =>
      new Promise<void>(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );
}
