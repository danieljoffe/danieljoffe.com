import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import Nav from '@/components/Nav';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      {/* pb-16 compensates for the fixed mobile bottom nav bar */}
      <div className='pb-16 md:pb-0'>
        <Footer />
      </div>
    </>
  );
}
