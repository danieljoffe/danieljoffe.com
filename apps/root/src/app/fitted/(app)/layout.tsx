import type { ReactNode } from 'react';
import FittedSidebar from './FittedSidebar';

export default function FittedAppLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-screen'>
      <FittedSidebar />
      <main className='flex-1 overflow-x-hidden p-4 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px)+1rem)] md:p-6 md:pb-6'>
        {children}
      </main>
    </div>
  );
}
