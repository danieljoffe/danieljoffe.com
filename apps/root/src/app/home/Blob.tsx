'use client';

import { useEffect } from 'react';
import { setGradientTheme } from '@/styles/blob.utils';
import styles from './blob.module.scss';

export default function Blob() {
  useEffect(() => {
    // Randomly set gradient theme on mount and periodically
    const interval = setInterval(
      setGradientTheme,
      Math.max(
        Math.floor(5250 * Math.random()),
        Math.floor(2525 * Math.random())
      )
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className='relative w-full h-full overflow-hidden bg-background'
      aria-hidden='true'
      role='img'
      aria-label='Decorative background animation'
    >
      <div className='absolute inset-0'>
        <div className={styles.blobShape} />
      </div>
      <div className='absolute inset-0'>
        <div className={`${styles.particle} ${styles.particle1}`} />
        <div className={`${styles.particle} ${styles.particle2}`} />
        <div className={`${styles.particle} ${styles.particle3}`} />
      </div>
      {/* Main blob shape */}
      <div className='absolute inset-0'>
        <div className={styles.blobShape2} />
      </div>

      {/* Floating particles */}
      <div className='absolute inset-0'>
        <div className={`${styles.particle} ${styles.particle4}`} />
        <div className={`${styles.particle} ${styles.particle5}`} />
        <div className={`${styles.particle} ${styles.particle6}`} />
      </div>
    </div>
  );
}
