import type { ReactNode } from 'react';
import { ToastProvider } from '@/state/Toast/ToastProvider';
import './global.css';

export const metadata = {
  title: 'WyrdFold',
  description: 'Personal AI-assisted job application workspace.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' className='pyre dark'>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
