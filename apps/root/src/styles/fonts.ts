import {
  Ibarra_Real_Nova,
  Plus_Jakarta_Sans,
  JetBrains_Mono,
} from 'next/font/google';

// HEADING FONT
export const ibarraRealNova = Ibarra_Real_Nova({
  subsets: ['latin'],
  variable: '--font-heading',
  fallback: ['Georgia', 'Times New Roman', 'serif'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  style: ['normal'],
});

// BODY FONT
export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  fallback: ['system-ui', '-apple-system', 'sans-serif'],
  display: 'swap',
  preload: true,
  adjustFontFallback: true,
  style: ['normal'],
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  fallback: ['Consolas', 'Monaco', 'monospace'],
  display: 'swap',
  preload: false, // Only preload critical fonts
  adjustFontFallback: true,
});

// COMBINED FONT VARIABLES
export const fontVariables = `${ibarraRealNova.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`;
