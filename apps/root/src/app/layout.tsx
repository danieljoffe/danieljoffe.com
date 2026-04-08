import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { rootMetadata } from '@/data/metadata/root';
import { WithChildren } from '@/types/base';
import '@/styles/global.css';
import Footer from '@/components/Footer';
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

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#4f46e5',
};

export default async function RootLayout({ children }: WithChildren) {
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
        {/* pb-16 compensates for the fixed mobile bottom nav bar */}
        <div className='pb-16 md:pb-0'>
          <Footer />
        </div>
        <Scripts />
        <TestingOnly />
      </body>
    </html>
  );
}
