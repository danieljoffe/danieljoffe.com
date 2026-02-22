import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google';

// HEADING FONT
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  display: 'optional',
  preload: true,
  adjustFontFallback: true,
  style: ['normal'],
  axes: ['WONK', 'opsz'],
});

// BODY FONT
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  display: 'optional',
  weight: ['400', '500', '600'],
  preload: true,
  adjustFontFallback: true,
});

export const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  fallback: ['Consolas', 'Monaco', 'monospace'],
  display: 'swap',
  preload: false, // Only preload critical fonts
  adjustFontFallback: true,
  weight: ['400', '600'],
});

// COMBINED FONT VARIABLES
export const fontVariables = `${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`;
