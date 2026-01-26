import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';

// HEADING FONT
export const ibarraRealNova = Fraunces({
  subsets: ['latin'],
  variable: '--font-heading',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  style: ['normal'],
  axes: ['WONK', 'opsz'],
});

// BODY FONT
export const plusJakartaSans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-body',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  style: ['normal'],
});

export const jetbrainsMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  fallback: ['Consolas', 'Monaco', 'monospace'],
  display: 'swap',
  preload: false, // Only preload critical fonts
  adjustFontFallback: true,
  weight: ['400', '600'],
});

// COMBINED FONT VARIABLES
export const fontVariables = `${ibarraRealNova.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`;
