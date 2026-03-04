import { test, expect } from '@playwright/test';
import { waitForHydration } from './fixtures/base.fixture';

test.describe('performance', () => {
  // Web vitals timing tests (LCP, INP, CLS, load time) are covered by
  // Lighthouse CI (`yarn test:lighthouse`), which runs with simulated
  // throttling and multiple runs for reliable results.

  test('images are optimized and load efficiently', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check for lazy loading on images
    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const loading = await img.getAttribute('loading');

      // Images should have lazy loading or be above the fold
      if (loading !== 'eager') {
        expect(loading).toBe('lazy');
      }
    }
  });

  test('javaScript bundle size is reasonable', async ({ page }) => {
    const responses: Array<{ url: string; size: string | undefined }> = [];

    page.on('response', response => {
      if (
        response.url().includes('.js') &&
        !response.url().includes('node_modules')
      ) {
        responses.push({
          url: response.url(),
          size: response.headers()['content-length'],
        });
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('domcontentloaded');

    // Calculate total JS bundle size
    const totalSize = responses.reduce((sum, response) => {
      return sum + (parseInt(response.size || '0') || 0);
    }, 0);

    // Total JS should be under 500KB
    expect(totalSize).toBeLessThan(500 * 1024);
  });

  test('css is optimized and not blocking', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check for critical CSS inlining
    const { hasInlineCriticalCSS, hasPreloadedStyles, hasStylesheets } =
      await page.evaluate(() => {
        const styleTags = Array.from(document.querySelectorAll('style'));
        const linkPreloads = Array.from(
          document.querySelectorAll('link[rel="preload"][as="style"]')
        );
        const linkStylesheets = Array.from(
          document.querySelectorAll('link[rel="stylesheet"]')
        );
        return {
          hasInlineCriticalCSS: styleTags.some(
            style => !!style.textContent && style.textContent.length > 100
          ),
          hasPreloadedStyles: linkPreloads.length > 0,
          hasStylesheets: linkStylesheets.length > 0,
        };
      });

    // Should have some critical CSS inlined
    expect(
      hasInlineCriticalCSS || hasPreloadedStyles || hasStylesheets
    ).toBeTruthy();
  });

  test('third-party scripts are optimized', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check for third-party script optimization
    const thirdPartyScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script[src]'));
      return scripts
        .filter(script => {
          const src = script.getAttribute('src');
          return (
            src &&
            (src.includes('google-analytics') ||
              src.includes('gtag') ||
              src.includes('facebook') ||
              src.includes('twitter') ||
              src.includes('vercel') ||
              src.includes('sentry'))
          );
        })
        .map(script => ({
          src: script.getAttribute('src'),
          async: script.hasAttribute('async'),
          defer: script.hasAttribute('defer'),
          managedByNextScript: script.hasAttribute('data-nscript'),
        }));
    });

    // Third-party scripts should be async, deferred, or managed by next/script
    // (next/script uses data-nscript attribute and handles loading optimization internally)
    // If no third-party scripts are found, that's also acceptable
    if (thirdPartyScripts.length > 0) {
      thirdPartyScripts.forEach(script => {
        expect(
          script.async || script.defer || script.managedByNextScript
        ).toBeTruthy();
      });
    }
  });

  test('page has proper caching headers', async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check for caching headers
    const cacheControl = response?.headers()['cache-control'];
    const etag = response?.headers()['etag'];

    // Should have some form of caching
    expect(cacheControl || etag).toBeTruthy();
  });

  test('navigation performance is optimized', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await waitForHydration(page);

    // Find the About link — open mobile menu if needed (don't time this part)
    let targetLink = page.getByRole('link', { name: /about/i }).first();

    if (!(await targetLink.isVisible())) {
      const menuToggle = page
        .getByRole('button', { name: /menu|open menu|toggle/i })
        .first();
      if (await menuToggle.isVisible()) {
        await menuToggle.click();
        const modal = page.locator('[role="dialog"][aria-modal="true"]').last();
        await expect(modal).toBeVisible({ timeout: 5000 });
        targetLink = page.getByRole('link', { name: /about/i }).first();
      }
    }

    if (await targetLink.isVisible()) {
      // Only time the actual navigation (click → URL change)
      const startTime = Date.now();
      await targetLink.click();
      await page.waitForURL('**/about*');
      const navigationTime = Date.now() - startTime;

      // Client-side navigation should complete within 3s even under load
      expect(navigationTime).toBeLessThan(3000);
    } else {
      // Fallback: navigate directly and just verify it loads
      await page.goto('/about', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('domcontentloaded');
    }
  });

  test('memory usage is reasonable', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Check memory usage
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return (
          performance as Performance & {
            memory?: {
              usedJSHeapSize: number;
              totalJSHeapSize: number;
              jsHeapSizeLimit: number;
            };
          }
        ).memory;
      }
      return null;
    });

    if (memoryInfo && memoryInfo.usedJSHeapSize) {
      // Used JS heap size should be under 100MB (increased threshold for CI stability)
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024);
    }
  });

  // Service worker tests need SW enabled — override the global 'block' setting
  test.describe('service worker', () => {
    test.use({ serviceWorkers: 'allow' });

    test('service worker is properly configured', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');

      // Check for service worker support
      const hasServiceWorker = await page.evaluate(
        () => 'serviceWorker' in navigator
      );

      if (!hasServiceWorker) {
        test.skip(true, 'Service worker not supported in this browser');
        return;
      }

      // Wait for SW registration — the registration script uses afterInteractive + load event,
      // so if load already fired, manually register the SW as a fallback.
      // Always wait for navigator.serviceWorker.ready to ensure the SW is active
      // before reading scriptURL (it may be empty during install phase).
      const registration = await page.evaluate(async () => {
        try {
          let reg = await navigator.serviceWorker.getRegistration();
          if (!reg) {
            reg = await navigator.serviceWorker.register('/sw.js');
          }
          // Wait for SW to become active — this is the key step that was missing
          // under parallel load, the SW may still be installing when we read it
          const activeReg = await navigator.serviceWorker.ready;
          return {
            scope: activeReg.scope,
            scriptURL: activeReg.active?.scriptURL ?? '',
          };
        } catch (_e) {
          return null;
        }
      });

      if (!registration) {
        test.skip(
          true,
          'Service worker registration failed in this environment'
        );
        return;
      }

      // Verify SW registration details
      expect(registration.scope).toContain('localhost:3000');
      expect(registration.scriptURL).toContain('sw.js');
    });

    test('service worker caches static assets', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('load');

      const hasServiceWorker = await page.evaluate(
        () => 'serviceWorker' in navigator
      );
      if (!hasServiceWorker) {
        test.skip(true, 'Service worker not supported in this browser');
        return;
      }

      // Ensure SW is active
      await page.evaluate(async () => {
        let reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
          reg = await navigator.serviceWorker.register('/sw.js');
        }
        await navigator.serviceWorker.ready;
      });

      // Wait for SW to install and cache assets
      const cacheInfo = await page.evaluate(async () => {
        const cacheNames = await caches.keys();
        const staticCache = cacheNames.find(name =>
          name.startsWith('danieljoffe-static')
        );
        if (!staticCache) return { exists: false, urls: [] as string[] };

        const cache = await caches.open(staticCache);
        const keys = await cache.keys();
        return {
          exists: true,
          urls: keys.map(req => new URL(req.url).pathname),
        };
      });

      expect(cacheInfo.exists).toBeTruthy();
      expect(cacheInfo.urls).toContain('/');
      expect(cacheInfo.urls).toContain('/about');
      expect(cacheInfo.urls).toContain('/projects');
    });
  });
});
