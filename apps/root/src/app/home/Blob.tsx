'use client';

import { useEffect, useRef } from 'react';
import { setGradientTheme } from '@/styles/blob.utils';
import styles from './blob.module.scss';

export default function Blob() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Set initial gradient theme on the scoped container
    setGradientTheme(el);

    // Periodically change gradient theme
    const interval = setInterval(
      () => setGradientTheme(el),
      Math.max(
        Math.floor(5250 * Math.random()),
        Math.floor(2525 * Math.random())
      )
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-surface ${styles.blobContainer}`}
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
