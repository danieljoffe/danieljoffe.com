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
    optimizeCss: {
      inline: ['critical'],
      removeUnusedCss: true,
    },
    optimizePackageImports: [
      'lucide-react',
      '@headlessui/react',
      '@gsap/react',
      'gsap',
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
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source:
          '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|monitoring).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache',
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

    // In test/CI environments, replace fonts.ts with fonts.mock.ts to avoid network requests
    if (isTest || isCI) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new (require('webpack').NormalModuleReplacementPlugin)(
          /src\/app\/fonts\.ts$/,
          require.resolve('./src/app/fonts.mock.ts')
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
  productionBrowserSourceMaps: true,
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

        // Automatically tree-shake Sentry logger statements to reduce bundle size
        disableLogger: true,

        // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
        // See the following for more information:
        // https://docs.sentry.io/product/crons/
        // https://vercel.com/docs/cron-jobs
        automaticVercelMonitors: true,
      });

module.exports = finalConfig;
