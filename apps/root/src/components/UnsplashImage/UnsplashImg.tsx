'use client';

import { useMemo } from 'react';
import Image, { ImageProps } from 'next/image';
import unsplashLoader from '@/utils/unsplashLoader';

export interface UnsplashImgProps {
  src: `/photo-${string}`;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  quality?: number;
  priority?: boolean;
  preload?: boolean;
  sizes?: string;
}

export default function UnsplashImg({
  src,
  alt,
  width,
  height,
  quality = 75,
  priority = false,
  fill = false,
  preload = false,
  sizes,
}: UnsplashImgProps) {
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
    unoptimized: false,
    decoding: 'async',
  };

  // Only pass sizes when explicitly provided. Without sizes, Next.js uses
  // x-descriptors capped at 2× width — giving tighter control over srcset.
  if (sizes) {
    imageProps.sizes = sizes;
  }

  const imageClasses = ['object-cover'];

  if (fill == false || (width && height)) {
    imageClasses.push('w-full h-auto');
    imageProps.width = width as number;
    imageProps.height = height as number;
  }

  if (preload) {
    imageProps.preload = true;
    imageProps.fetchPriority = 'high';
    imageProps.loading = undefined;
  } else {
    imageProps.fetchPriority = priority ? 'high' : 'low';
    imageProps.loading = priority ? 'eager' : 'lazy';
  }

  imageProps.className = imageClasses.join(' ');

  return <Image {...imageProps} alt={alt} />;
}
