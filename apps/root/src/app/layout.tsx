import type { Metadata, Viewport } from 'next';
import { rootMetadata } from '@/data/metadata/root';
import { josefinSans, irn, firaMono } from './fonts';
import '@/app/global.scss';

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

// Critical CSS for immediate above-the-fold rendering
// Inlined in server component to be part of initial HTML response
const criticalStyles = `
  html { font-size: 18px; }
  body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-family: var(--font-josefin-sans), Futura, Helvetica, sans-serif;
    color: #0f0f0f;
    background-color: #f5f5f5;
    font-weight: 300;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    height: 100vh;
    position: relative;
    padding-top: 3.75rem;
    margin: 0;
  }
  @media (min-width: 768px) {
    body { padding-top: 3.25rem; }
  }
  h1, h2, h3 {
    font-family: var(--font-irn), Garamond, Times, serif;
    font-weight: 500;
    letter-spacing: 0.025em;
    margin-bottom: 1rem;
    line-height: 1.2;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
`;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang='en'
      className={[
        josefinSans.variable,
        irn.variable,
        firaMono.variable,
        'scroll-smooth',
      ].join(' ')}
    >
      <head>
        {/* Critical inline styles for immediate rendering */}
        <style dangerouslySetInnerHTML={{ __html: criticalStyles }} />
        {/* Resource hints for third-party services */}
        <link rel='preconnect' href='https://sentry.io' />
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
