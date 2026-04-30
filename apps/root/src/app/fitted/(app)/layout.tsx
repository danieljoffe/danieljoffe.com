import type { ReactNode } from 'react';
import FittedSidebar from './FittedSidebar';

export default function FittedAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen'>
      <FittedSidebar />
      <main className='flex-1 overflow-x-hidden p-4 md:p-6'>
        {children}
        {/* Clearance for the mobile bottom nav (h-14) + iOS home indicator. */}
        <div
          aria-hidden='true'
          className='md:hidden'
          style={{
            height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 1rem)',
          }}
        />
      </main>
    </div>
  );
}
