import { Fira_Code, Ibarra_Real_Nova, Josefin_Sans } from 'next/font/google';

export const josefinSans = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin-sans',
  fallback: ['Futura', 'Helvetica', 'sans-serif'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

export const irn = Ibarra_Real_Nova({
  subsets: ['latin'],
  variable: '--font-irn',
  fallback: ['Garamond', 'Times', 'serif'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
});

export const firaMono = Fira_Code({
  subsets: ['latin'],
  variable: '--font-fira-code',
  fallback: ['Fira Mono', 'Droid Sans Mono', 'Courier New', 'monospace'],
  display: 'swap',
  preload: false, // Only preload critical fonts
  adjustFontFallback: true,
});
