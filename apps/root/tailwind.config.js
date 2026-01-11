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
      // Only extend with what you actually use
      fontFamily: {
        sans: ['var(--font-josefin-sans)', 'Futura', 'Helvetica', 'sans-serif'],
        serif: ['var(--font-irn)', 'Garamond', 'Times', 'serif'],
        mono: [
          'var(--font-fira-code)',
          'Fira Mono',
          'Droid Sans Mono',
          'Courier New',
          'monospace',
        ],
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
