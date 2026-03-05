import { publicEnv } from '@/lib/public.env';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { rootStructuredData } from '@/data/structuredData/root';
import Script from 'next/script';
import { isProduction } from '@/utils/helpers';

export default function Scripts() {
  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(rootStructuredData).replace(/</g, '\\u003c'),
        }}
      />
      {/*
        Suppress known third-party console errors in production.
        Uses afterInteractive so it doesn't block initial render / LCP.
        Covered by 'strict-dynamic' CSP (injected by Next.js runtime).
      */}
      <Script
        id='suppressConsoleErrors'
        strategy='afterInteractive'
        dangerouslySetInnerHTML={{
          __html: `
              var originalError = console.error;
              var suppressedPatterns = [
                'Non-Error promise rejection',
                'ResizeObserver loop limit exceeded',
                'ChunkLoadError',
                'Loading chunk',
                'Loading CSS chunk'
              ];
              console.error = function() {
                var message = Array.prototype.join.call(arguments, ' ');
                for (var i = 0; i < suppressedPatterns.length; i++) {
                  if (message.indexOf(suppressedPatterns[i]) !== -1) return;
                }
                originalError.apply(console, arguments);
              };
            `,
        }}
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
      />
      <Script
        id='serviceWorker'
        strategy='afterInteractive'
        dangerouslySetInnerHTML={{
          __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
        }}
      />
      {/* Only render on Vercel — these fetch /_vercel/ scripts that 404 locally */}
      {process.env.VERCEL && <SpeedInsights debug={!isProduction()} />}
      {process.env.VERCEL && (
        <Analytics
          mode={isProduction() ? 'production' : 'development'}
          debug={!isProduction()}
        />
      )}
      {/*
        Manual GA implementation replaces @next/third-parties GoogleAnalytics.
        The library component uses afterInteractive (default) which causes
        Next.js to inject <link rel="preload"> for the gtag script. The
        preloaded resource goes unused until hydration finishes, triggering
        a browser console warning. Using lazyOnload avoids the preload hint.
      */}
      <Script
        id='_next-ga-init'
        strategy='lazyOnload'
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${publicEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}');
          `,
        }}
      />
      <Script
        id='_next-ga'
        strategy='lazyOnload'
        src={`https://www.googletagmanager.com/gtag/js?id=${publicEnv.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID}`}
      />
    </>
  );
}
