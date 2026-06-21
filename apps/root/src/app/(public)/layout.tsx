import type { ReactNode } from 'react';
import Footer from '@/components/Footer';
import Nav from '@/components/Nav';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />
      {children}
      {/* Trailing whitespace before the footer now lives here (the page shell
          adds no padding). pb-16 compensates for the fixed mobile bottom nav. */}
      <div className='pt-16 pb-16 md:pb-0 lg:pt-24'>
        <Footer />
      </div>
    </>
  );
}
