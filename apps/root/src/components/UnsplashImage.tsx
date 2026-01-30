'use client';

import { useMemo } from 'react';
import Image, { ImageProps } from 'next/image';
import { UNSPLASH_URL } from '@/utils/constants';
import unsplashLoader from '@/utils/unsplashLoader';
import Button from '@/components/Button';

export type UnsplashImageMeta = {
  alt: string;
  src: `/photo-${string}`;
  origin: `${typeof UNSPLASH_URL}/photos${string}`;
  creator: `@${string}`;
  blurHash: string;
};

export type UnsplashImageProps = UnsplashImageMeta & {
  priority: boolean;
  width?: number;
  height?: number;
  fill?: boolean;
  quality?: number;
};

export default function UnsplashImage({
  src,
  alt,
  creator,
  origin,
  width,
  height,
  quality = 75,
  priority = false,
  fill = false,
}: UnsplashImageProps) {
  if (!src || !alt || !creator || !origin) {
    throw new Error('Missing required props');
  }

  if (fill == false && (!width || !height)) {
    throw new Error('Missing required props');
  }

  const loader = useMemo(() => {
    return unsplashLoader(width, height);
  }, [width, height]);

  const imageProps: ImageProps = {
    loader,
    src,
    alt,
    priority,
    fill,
    quality,
    sizes:
      '(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 800px',
    unoptimized: false,
    decoding: 'async',
  };

  const imageClasses = ['object-cover'];

  if (fill == false || (width && height)) {
    imageClasses.push('w-full h-auto');
    imageProps.width = width as number;
    imageProps.height = height as number;
  }

  imageProps.fetchPriority = priority ? 'high' : 'low';
  imageProps.loading = priority ? 'eager' : 'lazy';
  imageProps.className = imageClasses.join(' ');

  return (
    <figure
      className='flex relative'
      style={{ aspectRatio: width && height ? `${width}/${height}` : '9/16' }}
    >
      <Image {...imageProps} alt={alt} />
      <figcaption
        className={[
          'absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t',
          'from-black/75 to-transparent flex justify-end',
        ].join(' ')}
      >
        <p className='text-white'>
          <Button
            as='link'
            variant='link'
            size='sm'
            href={`${UNSPLASH_URL}/${creator}`}
            target='_blank'
            rel='noopener noreferrer'
            aria-label={`Photo by ${creator} on Unsplash`}
          >
            Photo by {creator},
          </Button>
          <Button
            as='link'
            variant='link'
            size='sm'
            href={origin}
            target='_blank'
            rel='noopener noreferrer'
            aria-label='View original photo on Unsplash'
          >
            Unsplash
          </Button>
        </p>
      </figcaption>
    </figure>
  );
}
