//@ts-check

const { composePlugins, withNx } = require('@nx/next');
const { withBotId } = require('botid/next/config');
const createMDX = require('@next/mdx');
const bundleAnalyzer = require('@next/bundle-analyzer');

const isDev = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';
const isCI = process.env.CI === 'true';
const mockFonts = process.env.MOCK_FONTS === 'true';
const isAnalyze = process.env.ANALYZE === 'true';

// Bundle analyzer
const withBundleAnalyzer = bundleAnalyzer({
  enabled: isAnalyze,
});

const withMDX = createMDX({});

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  // Performance optimizations
  experimental: {
    // Disable fetch caching across HMR refreshes so dev always shows fresh data
    serverComponentsHmrCache: false,
    cssChunking: true,
    // Enable critical CSS inlining with critters
    optimizeCss: true,
    optimizePackageImports: [
      '@gsap/react',
      'gsap',
      '@sentry/nextjs',
      'yup',
      'schema-dts',
      '@danieljoffe.com/shared-ui',
    ],
    // Disable in CI/test
    webpackBuildWorker: !isTest && !isCI,
  },

  // Include OG image fonts and profile image in serverless function bundles.
  // readFile(process.cwd()) paths aren't auto-traced by Next.js file tracing.
  outputFileTracingIncludes: {
    '/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
    '/about/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
    '/experience/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
    '/experience/[slug]/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
    '/projects/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
    '/projects/[slug]/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
    '/services/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
    '/audit/r/[id]/opengraph-image': [
      './assets/fonts/og/*',
      './public/images/daniel-joffe-profile.webp',
    ],
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [640, 768, 1024, 1280],
    imageSizes: [16, 32, 48, 64, 256, 400],
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compression
  compress: true,

  // Security
  poweredByHeader: false,

  // Headers (additional to proxy)
  async headers() {
    return [
      // Security headers for all routes
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // COOP is ignored by browsers on non-trustworthy origins (non-HTTPS,
          // non-localhost), so skip it in dev to avoid console warnings.
          ...(isDev
            ? []
            : [
                {
                  key: 'Cross-Origin-Opener-Policy',
                  value: 'same-origin',
                },
              ]),
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Static images - immutable, 1 year
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Next.js static assets - immutable, 1 year
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Next.js optimized images - respect upstream cache headers
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // Static files at root - long cache
      {
        source: '/:file(favicon.ico|sitemap.xml|robots.txt)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      // API routes - no caching (but allow bfcache by avoiding no-store on responses)
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, must-revalidate',
          },
        ],
      },
      // Root route - bfcache compatible
      {
        source: '/',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      // HTML pages - bfcache compatible caching
      {
        source:
          '/:path((?!api|_next|images|favicon.ico|sitemap.xml|robots.txt|monitoring).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },

  // Redirects for better SEO
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
    ];
  },

  /** @param {import('webpack').Configuration} config */
  webpack: config => {
    // Add custom condition for workspace packages to resolve to source
    config.resolve = config.resolve || {};
    config.resolve.conditionNames = [
      '@danieljoffe.com/source',
      ...(config.resolve.conditionNames || ['import', 'require', 'default']),
    ];

    // Replace real Google Fonts with system-font mocks to avoid network requests
    // and ensure consistent rendering across environments.
    // Triggers: CI=true (automatic in GitHub Actions) or MOCK_FONTS=true (local opt-in).
    // This is a BUILD-TIME webpack plugin — must be set when running `next build`,
    // not `next start` (which forces NODE_ENV=production regardless).
    if (mockFonts || isCI) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (require('webpack').NormalModuleReplacementPlugin)(
          /src\/styles\/fonts\.ts$/,
          require.resolve('./src/styles/fonts.mock.ts')
        )
      );
    }

    return config;
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  // Source maps are uploaded to Sentry for error debugging
  // but not exposed to browsers to reduce bundle size
  productionBrowserSourceMaps: false,
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
  withBundleAnalyzer,
  withMDX,
];

// Injected content via Sentry wizard below
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfigWithPlugins = composePlugins(...plugins)(nextConfig);

// Only apply Sentry config if not in CI or test environment
const finalConfig =
  isCI || isTest
    ? nextConfigWithPlugins
    : withSentryConfig(nextConfigWithPlugins, {
        // For all available options, see:
        // https://www.npmjs.com/package/@sentry/webpack-plugin#options

        org: 'testing-b1',
        project: 'javascript-nextjs',

        // Only print logs for uploading source maps in CI
        silent: !isCI,

        // For all available options, see:
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

        // Upload a larger set of source maps for prettier stack traces (increases build time)
        widenClientFileUpload: true,

        // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
        // This can increase your server load as well as your hosting bill.
        // Note: Check that the configured route will not match with your Next.js proxy, otherwise reporting of client-
        // side errors will fail.
        tunnelRoute: '/monitoring',

        // Webpack-specific Sentry options
        webpack: {
          // Tree-shake Sentry logger statements to reduce bundle size
          treeshake: {
            removeDebugLogging: true,
          },
          // Enables automatic instrumentation of Vercel Cron Monitors
          // See: https://docs.sentry.io/product/crons/
          automaticVercelMonitors: true,
        },
      });

module.exports = withBotId(finalConfig);
