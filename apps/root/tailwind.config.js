const { createGlobPatternsForDependencies } = require('@nx/next/tailwind');

// The above utility import will not work if you are using Next.js' --turbo.
// Instead you will have to manually add the dependent paths to be included.
// For example
// ../libs/buttons/**/*.{ts,tsx,js,jsx,html}',                 <--- Adding a shared lib
// !../libs/buttons/**/*.{stories,spec}.{ts,tsx,js,jsx,html}', <--- Skip adding spec/stories files from shared lib

// If you are **not** using `--turbo` you can uncomment both lines 1 & 19.
// A discussion of the issue can be found: https://github.com/nrwl/nx/issues/26510

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './{src,pages,components,app}/**/*.{ts,tsx,js,jsx,html}',
    '!./{src,pages,components,app}/**/*.{stories,spec}.{ts,tsx,js,jsx,html}',
    // Include shared UI library
    '../../libs/ui/src/**/*.{ts,tsx,js,jsx}',
    '!../../libs/ui/src/**/*.{stories,spec}.{ts,tsx,js,jsx}',
    ...createGlobPatternsForDependencies(__dirname),
  ],
  // Enable JIT mode for better performance and smaller CSS output
  mode: 'jit',
  // Safelist critical classes that are always needed
  safelist: [
    // Critical layout classes
    'antialiased',
    'font-sans',
    'text-neutral-900',
    'bg-neutral-100',
    'font-light',
    'flex',
    'flex-col',
    'h-screen',
    'relative',
    'pt-[3.75rem]',
    'md:pt-[3.25rem]',
    // Critical focus styles
    'focus:outline-blue-500',
    'focus:outline-2',
    'focus:outline-offset-2',
    'focus-visible:outline-blue-500',
    'focus-visible:outline-2',
    'focus-visible:outline-offset-2',
    // Critical typography
    'font-serif',
    'font-medium',
    'tracking-wide',
    'text-6xl',
    'text-4xl',
    'text-2xl',
    'mb-4',
    'mb-2',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', 'Georgia', 'Times New Roman', 'serif'],
        body: ['var(--font-body)', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['var(--font-mono)', 'Fira Code', 'Consolas', 'monospace'],
      },

      // =====================================================================
      // FONT SIZES (with line-height and letter-spacing)
      // Using 1.25 (Major Third) scale
      // =====================================================================
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.025em' }], // 12px
        sm: ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }], // 14px
        base: ['1rem', { lineHeight: '1.5', letterSpacing: '0' }], // 16px
        lg: ['1.125rem', { lineHeight: '1.5', letterSpacing: '0' }], // 18px
        xl: ['1.25rem', { lineHeight: '1.375', letterSpacing: '0' }], // 20px
        '2xl': ['1.563rem', { lineHeight: '1.375', letterSpacing: '0' }], // 25px
        '3xl': ['1.953rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], // 31px
        '4xl': ['2.441rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }], // 39px
        '5xl': ['3.052rem', { lineHeight: '1.2', letterSpacing: '-0.04em' }], // 49px
        '6xl': ['3.815rem', { lineHeight: '1.1', letterSpacing: '-0.04em' }], // 61px
      },

      // =====================================================================
      // LETTER SPACING (extend defaults)
      // =====================================================================
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '0',
        wide: '0.025em',
        wider: '0.05em',
        widest: '0.1em',
      },

      // =====================================================================
      // LINE HEIGHTS (extend defaults)
      // =====================================================================
      lineHeight: {
        none: '1',
        tight: '1.2',
        snug: '1.375',
        normal: '1.5',
        relaxed: '1.625',
        loose: '1.75',
      },
    },
  },
  plugins: [],
  // Enable CSS purging for production
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './{src,pages,components,app}/**/*.{ts,tsx,js,jsx,html}',
      '!./{src,pages,components,app}/**/*.{stories,spec}.{ts,tsx,js,jsx,html}',
    ],
    // Keep critical classes
    safelist: [
      'antialiased',
      'font-sans',
      'text-neutral-900',
      'bg-neutral-100',
      'font-light',
      'flex',
      'flex-col',
      'h-screen',
      'relative',
    ],
  },
};
