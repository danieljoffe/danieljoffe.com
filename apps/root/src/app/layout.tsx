import type { Metadata, Viewport } from 'next';
import { rootMetadata } from './metadata';
import { josefinSans, irn, firaMono } from './fonts';
import '@/app/global.scss';

import HeadClient from './home/HeadClient';
import Button from '@/components/units/Button';
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
    <html
      lang='en'
      className={[
        josefinSans.variable,
        irn.variable,
        firaMono.variable,
        'scroll-smooth',
      ].join(' ')}
    >
      <HeadClient />
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
