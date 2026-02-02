import type { Metadata, Viewport } from 'next';
import { rootMetadata } from '@/data/metadata/root';
import { WChildrenT } from '@/types/base';
import { fontVariables } from '@/styles/fonts';
import '@/styles/global.scss';
import Button from '@/components/Button';
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
