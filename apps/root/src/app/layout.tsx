import type { Metadata, Viewport } from 'next';
import { rootMetadata } from '@/data/metadata/root';
import { WChildrenT } from '@/types/base';
import { fontVariables } from '@/styles/fonts';
import '@/styles/global.scss';
import AppContext from './home/AppContext';
import Scripts from './home/Scripts';
import Head from './home/Head';

export const metadata: Metadata = rootMetadata;
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  userScalable: true,
  themeColor: '#0056b3',
};

export default async function RootLayout({ children }: WChildrenT) {
  return (
    <html lang='en' className={[fontVariables, 'scroll-smooth'].join(' ')}>
      <Head />
      <body
        className={[
          'focus:outline-blue-500 focus:outline-2 focus:outline-offset-2',
          'focus-visible:outline-blue-500 focus-visible:outline-2',
          'focus-visible:outline-offset-2',
        ].join(' ')}
      >
        <a
          href='#main-content'
          className='sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:p-2 focus:bg-background focus:text-foreground focus:underline focus:rounded'
          id='skipToMainContent'
        >
          Skip to main content
        </a>
        <AppContext>{children}</AppContext>
        <Scripts />
      </body>
    </html>
  );
}
