'use client';

import { useEffect } from 'react';
import { setGradientTheme } from './blob.utils';
import styles from './blob.module.scss';

export default function BlobCSS() {
  useEffect(() => {
    // Randomly set gradient theme on mount and periodically
    const interval = setInterval(setGradientTheme, 8000);
    setGradientTheme();

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={styles.blobContainer}
      aria-hidden='true'
      role='img'
      aria-label='Decorative background animation'
    >
      {/* Main blob shape */}
      <div className={styles.blobWrapper}>
        <div
          className={`${styles.blobShape} animate-float will-change-transform gpu-accelerated`}
        />
      </div>

      {/* Floating particles */}
      <div className={styles.particlesContainer}>
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
      </div>
    </div>
  );
}
