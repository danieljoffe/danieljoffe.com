import type { Metadata, Viewport } from 'next';
import * as Sentry from '@sentry/nextjs';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { headers } from 'next/headers';
import { rootMetadata } from '@/data/metadata/root';
import { WithChildren } from '@/types/base';
import '@/styles/global.css';
import AppContext from './home/AppContext';
import Scripts from './home/Scripts';
import Head from './home/Head';
import TestingOnly from './home/TestingOnly';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export function generateMetadata(): Metadata {
  return {
    ...rootMetadata,
    other: {
      ...rootMetadata.other,
      ...Sentry.getTraceData(),
    },
  };
}
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#4f46e5',
};

export default async function RootLayout({ children }: WithChildren) {
  // Same nonce the proxy set in the CSP header, so the inline no-flash script
  // below satisfies `strict-dynamic` instead of being blocked.
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return (
    <html
      lang='en'
      data-scroll-behavior='smooth'
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} bg-surface text-text-primary text-[16px]`}
    >
      <Head />
      <body
        className={[
          'bg-surface text-text-primary font-sans',
          'focus:outline-brand-500 focus:outline-2 focus:outline-offset-2',
          'focus-visible:outline-brand-500 focus-visible:outline-2',
          'focus-visible:outline-offset-2 relative',
        ].join(' ')}
      >
        {/* No-flash reveal trigger: arms the scroll-reveal hidden state before
            first paint, only when JS is on and motion is allowed. Without this
            (no-JS / reduced-motion) content renders immediately and unhidden. */}
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('reveal-ready')}}catch(e){}",
          }}
        />
        <a
          href='#main-content'
          className={[
            'sr-only focus:not-sr-only focus:absolute focus:top-2',
            'focus:left-2 focus:z-50 focus:p-2 focus:bg-surface',
            'focus:text-text-primary focus:underline focus:rounded',
          ].join(' ')}
          id='skipToMainContent'
        >
          Skip to main content
        </a>
        <AppContext>{children}</AppContext>
        <Scripts />
        <TestingOnly />
      </body>
    </html>
  );
}
