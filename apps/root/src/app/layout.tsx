import type { Metadata, Viewport } from 'next';
import { rootMetadata } from '@/data/metadata/root';

import { fontVariables } from '../typography/fonts';
import { CRITICAL_STYLES } from '@/typography/styles';
import Button from '@/components/Button';
import AppContext from './home/AppContext';
import Scripts from './home/Scripts';

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#0056b3',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={[fontVariables, 'scroll-smooth'].join(' ')}>
      <head>
        {/* Critical inline styles for immediate rendering */}
        <style dangerouslySetInnerHTML={{ __html: CRITICAL_STYLES }} />
        {/* Resource hints for third-party services */}
        <link rel='dns-prefetch' href='https://sentry.io' />
        <link rel='dns-prefetch' href='https://www.googletagmanager.com' />
        <link rel='dns-prefetch' href='https://www.google-analytics.com' />
        <link rel='dns-prefetch' href='https://hcaptcha.com' />
        <link rel='dns-prefetch' href='https://api.hcaptcha.com' />
        <link rel='prefetch' href='https://images.unsplash.com' />
        <link rel='prefetch' href='https://unsplash.com' />
      </head>
      <body
        className={[
          'antialiased font-sans text-neutral-900 bg-neutral-100 font-light line-height-1.5',
          'flex flex-col h-screen relative pt-[3.75rem] md:pt-[3.25rem]',
          'focus:outline-blue-500 focus:outline-2 focus:outline-offset-2',
          'focus-visible:outline-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2',
        ].join(' ')}
      >
        <Button
          as='link'
          href='#main-content'
          aria-label='Skip to main content'
          className='sr-only focus:not-sr-only max-w-fit z-50'
          id='skipToMainContent'
        >
          Skip to main content
        </Button>
        <AppContext>{children}</AppContext>
        <Scripts />
      </body>
    </html>
  );
}
