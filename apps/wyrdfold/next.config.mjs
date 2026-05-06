//@ts-check

import { composePlugins, withNx } from '@nx/next';

const isTest = process.env.NODE_ENV === 'test';
// CI provider conventions vary: GitHub Actions sets CI=true, Vercel sets CI=1.
// Truthy check handles both. Also explicitly include VERCEL for clarity.
const isCI = !!process.env.CI || process.env.VERCEL === '1';

// Derive the Supabase storage host from env so user-uploaded resume PDFs
// served from Supabase Storage pass through next/image. Falls back to
// undefined if missing — _next/image rejects unknown hosts safely.
const supabaseHost = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
})();

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  devIndicators: false,
  experimental: {
    optimizePackageImports: ['yup'],
    webpackBuildWorker: !isTest && !isCI,
  },

  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost }]
      : [],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [640, 768, 1024, 1280],
    imageSizes: [16, 32, 48, 64, 256, 400],
    contentDispositionType: 'inline',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  compress: true,
  poweredByHeader: false,

  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          ...(isDev
            ? []
            : [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin' }]),
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/:file(favicon.ico|sitemap.xml|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, must-revalidate',
          },
        ],
      },
      {
        source: '/',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source:
          '/:path((?!api|_next|images|favicon.ico|sitemap.xml|robots.txt|monitoring).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },

  /** @param {import('webpack').Configuration} config */
  webpack: config => {
    config.resolve = config.resolve || {};
    config.resolve.conditionNames = [
      '@danieljoffe.com/source',
      ...(config.resolve.conditionNames || ['import', 'require', 'default']),
    ];
    return config;
  },
  // Turbopack uses the package.json `exports` field directly, so workspace
  // resolution works via the `default` condition (the built dist) rather
  // than the custom `@danieljoffe.com/source` condition wired up in the
  // webpack block above. No SVG-as-component loader rules are needed since
  // wyrdfold imports SVG icons via lucide-react components, not file imports.
  // Block is here for parity with apps/root/next.config.mjs.
  turbopack: {},

  productionBrowserSourceMaps: false,
};

const plugins = [withNx];

const { withSentryConfig } = await import('@sentry/nextjs');

const nextConfigWithPlugins = composePlugins(...plugins)(nextConfig);

// Skip Sentry config in CI/test to keep build deterministic and avoid
// uploading source maps during PR checks.
const finalConfig =
  isCI || isTest
    ? nextConfigWithPlugins
    : withSentryConfig(nextConfigWithPlugins, {
        org: 'testing-b1',
        project: 'wyrdfold',

        silent: !isCI,
        widenClientFileUpload: true,
        tunnelRoute: '/monitoring',

        webpack: {
          treeshake: { removeDebugLogging: true },
          automaticVercelMonitors: true,
        },
      });

export default finalConfig;
