import type { ReactNode } from 'react';
import { ToastProvider } from '@/state/Toast/ToastProvider';
import { ThemeProvider } from '@/state/Theme/ThemeProvider';
import './global.css';

export const metadata = {
  title: {
    template: '%s | WyrdFold',
    default: 'WyrdFold',
  },
  description: 'AI-assisted job search command center.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' className='pyre dark'>
      <body>
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
