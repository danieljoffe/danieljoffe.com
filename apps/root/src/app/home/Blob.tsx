'use client';

import { useEffect } from 'react';
import { setGradientTheme } from '@/styles/blob.utils';
import styles from './blob.module.scss';

export default function BlobCSS() {
  useEffect(() => {
    // Randomly set gradient theme on mount and periodically
    const interval = setInterval(
      setGradientTheme,
      Math.max(8000 * Math.random(), 2000 * Math.random())
    );
    setGradientTheme();

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={[
        styles.blobContainer,
        'relative w-full h-full overflow-hidden bg-neutral-900',
      ].join(' ')}
      aria-hidden='true'
      role='img'
      aria-label='Decorative background animation'
    >
      {/* Main blob shape */}
      <div className='absolute flex items-center justify-center inset-0'>
        <div
          className={`${styles.blobShape} w-[40rem] h-[40rem] animate-float will-change-transform gpu-accelerated`}
        />
      </div>

      {/* Floating particles */}
      <div className='absolute inset-0'>
        <div
          className={`${styles.particle} ${styles.particle1} animate-float`}
          style={{ animationDelay: '0.25s' }}
        />
        <div
          className={`${styles.particle} ${styles.particle2} animate-float`}
          style={{ animationDelay: '0.5s' }}
        />
        <div
          className={`${styles.particle} ${styles.particle3} animate-float`}
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className={`${styles.particle} ${styles.particle4} animate-float`}
          style={{ animationDelay: '2.5s' }}
        />
        <div
          className={`${styles.particle} ${styles.particle5} animate-float`}
          style={{ animationDelay: '3.25s' }}
        />
        <div
          className={`${styles.particle} ${styles.particle6} animate-float`}
          style={{ animationDelay: '3.25s' }}
        />
      </div>
    </div>
  );
}
