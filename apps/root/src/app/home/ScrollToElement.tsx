'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ScrollToElement() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const element = document.getElementById(searchParams.get('scrollTo') || '');
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
      });
    }
    return () => {
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    };
  }, [searchParams]);

  return null;
}
