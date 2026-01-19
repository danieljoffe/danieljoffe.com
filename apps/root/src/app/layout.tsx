import { promises as fs } from 'fs';
import path from 'node:path';
import type { Metadata, Viewport } from 'next';
import { rootMetadata } from '@/data/metadata/root';

import { fontVariables } from '@/styles/fonts';
import Button from '@/components/Button';
import AppContext from './home/AppContext';
import Scripts from './home/Scripts';
import '@/styles/tailwind.scss';
import { WChildrenT } from '@/types/base';

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#0056b3',
};

async function getCriticalStyles() {
  const stylesPath = path.join(
    process.cwd(),
    'src/styles/_critical-styles.css'
  );
  const criticalStyles = await fs.readFile(stylesPath, 'utf-8');

  return criticalStyles;
}

export default async function RootLayout({ children }: WChildrenT) {
  const criticalStyles = await getCriticalStyles();

  return (
    <html lang='en' className={[fontVariables, 'scroll-smooth'].join(' ')}>
      <head>
        {/* Critical inline styles for immediate rendering */}
        <style dangerouslySetInnerHTML={{ __html: criticalStyles }} />
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
          'focus:outline-blue-500 focus:outline-2 focus:outline-offset-2',
          'focus-visible:outline-blue-500 focus-visible:outline-2',
          'focus-visible:outline-offset-2 text-neutral-900',
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
