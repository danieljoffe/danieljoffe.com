//@ts-check

const { composePlugins, withNx } = require('@nx/next');
const createMDX = require('@next/mdx');
const bundleAnalyzer = require('@next/bundle-analyzer');

const isTest = process.env.NODE_ENV === 'test';
const isCI = process.env.CI === 'true';
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
    cssChunking: 'strict',
    // Enable critical CSS inlining with critters
    optimizeCss: true,
    optimizePackageImports: [
      '@gsap/react',
      'gsap',
      '@sentry/nextjs',
      'yup',
      'schema-dts',
    ],
    // Disable in CI/test
    webpackBuildWorker: !isTest && !isCI,
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
    ],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    deviceSizes: [640, 768, 1024, 1280],
    imageSizes: [16, 32, 48, 64],
    qualities: [80, 90],
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Compression
  compress: true,

  // Security
  poweredByHeader: false,

  // Headers (additional to middleware)
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
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
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

  /**
   * @param {import('webpack').Configuration} config
   * @param {{ dev: boolean, isServer: boolean }} options
   */
  webpack: (config, options) => {
    const { dev, isServer } = options;

    // Add custom condition for workspace packages to resolve to source
    config.resolve = config.resolve || {};
    config.resolve.conditionNames = [
      '@danieljoffe.com/source',
      ...(config.resolve.conditionNames || ['import', 'require', 'default']),
    ];

    // In test/CI environments, replace fonts.ts with fonts.mock.ts to avoid network requests
    if (isTest || isCI) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (require('webpack').NormalModuleReplacementPlugin)(
          /src\/app\/fonts\.ts$/,
          require.resolve('./src/fonts.mock.ts')
        )
      );
    }

    // Optimize bundle size and code splitting
    if (!dev && !isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        ...(config.optimization.splitChunks || {}),
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: -10,
            reuseExistingChunk: true,
          },
          gsap: {
            test: /[\\/]node_modules[\\/](gsap|@gsap)[\\/]/,
            name: 'gsap',
            chunks: 'all',
            priority: 10,
          },
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 10,
          },
          ui: {
            test: /[\\/]node_modules[\\/](@headlessui|lucide-react)[\\/]/,
            name: 'ui',
            chunks: 'all',
            priority: 5,
          },
          sentry: {
            test: /[\\/]node_modules[\\/]@sentry[\\/]/,
            name: 'sentry',
            chunks: 'all',
            priority: 15,
          },
          validation: {
            test: /[\\/]node_modules[\\/](yup|schema-dts)[\\/]/,
            name: 'validation',
            chunks: 'all',
            priority: 5,
          },
          // CSS optimization
          styles: {
            name: 'styles',
            test: /\.(css|scss)$/,
            chunks: 'all',
            enforce: true,
            priority: 20,
          },
          criticalStyles: {
            name: 'critical-styles',
            test: /critical\.(css|scss)$/,
            chunks: 'all',
            enforce: true,
            priority: 30,
          },
        },
      };
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
        // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
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

module.exports = finalConfig;
