import { publicEnv } from '@/lib/public.env';
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { rootStructuredData } from '@/data/structuredData/root';
import Script from 'next/script';
import { headers } from 'next/headers';
import { serverEnv } from '@/lib/env';
import { criticalStyles } from '@/styles/_critical-styles';

const isProduction = serverEnv.NODE_ENV === 'production';
export default async function Scripts() {
  const headersStore = await headers();
  const nonce = headersStore.get('x-nonce') ?? undefined;

  return (
    <>
      <Script
        id='injectCriticalStyles'
        strategy='beforeInteractive'
        dangerouslySetInnerHTML={{
          __html: `
          if (typeof window !== 'undefined') {
            const styleElement = document.createElement("style");
            styleElement.innerHTML = \`${criticalStyles}\`;
            document.head.prepend(styleElement);
          }
          `,
        }}
        nonce={nonce}
      />

      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(rootStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      {/*
        Suppress known third-party console errors in production.
        These are benign errors from browser APIs and chunk loading that
        don't affect functionality but clutter console output.
      */}
      <Script
        id='suppressConsoleErrors'
        strategy='beforeInteractive'
        dangerouslySetInnerHTML={{
          __html: `
              if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
                const originalError = console.error;
                const suppressedPatterns = [
                  'Non-Error promise rejection',
                  'ResizeObserver loop limit exceeded',
                  'ChunkLoadError',
                  'Loading chunk',
                  'Loading CSS chunk'
                ];
                console.error = function(...args) {
                  const message = args.join(' ');
                  if (suppressedPatterns.some(pattern => message.includes(pattern))) {
                    return;
                  }
                  originalError.apply(console, args);
                };
              }
            `,
        }}
        nonce={nonce}
      />
      {/*
        Workaround for Next.js App Router streaming behavior where meta tags
        may briefly render outside <head> during hydration, causing Lighthouse
        "Document does not have a meta description" errors.
        See: https://github.com/vercel/next.js/issues/49373
      */}
      <Script
        id='ensureMetaInHead'
        strategy='afterInteractive'
        dangerouslySetInnerHTML={{
          __html: `(() => {
              const selectors = [
                'meta[name="description"]',
                'meta[property="og:description"]',
                'meta[name="twitter:description"]',
                'title'
              ];
              selectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(el => {
                  if (el.parentElement && el.parentElement.tagName !== 'HEAD') {
                    document.head.appendChild(el);
                  }
                });
              });
            })();`,
        }}
        nonce={nonce}
      />
      <Script
        id='serviceWorker'
        strategy='afterInteractive'
        dangerouslySetInnerHTML={{
          __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
        }}
        nonce={nonce}
      />
      <SpeedInsights debug={!isProduction} />
      <Analytics
        mode={isProduction ? 'production' : 'development'}
        debug={!isProduction}
      />
      <GoogleAnalytics
        gaId={publicEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID as string}
        {...(nonce ? { nonce } : {})}
      />
    </>
  );
}
