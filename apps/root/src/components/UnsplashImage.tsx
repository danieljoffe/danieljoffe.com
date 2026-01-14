'use client';
import { UNSPLASH_URL } from '@/utils/constants';
import Image, { ImageProps } from 'next/image';
import Button from '@/components/Button';
import { Blurhash } from 'react-blurhash';
import unsplashLoader from '@/utils/unsplashLoader';
import { useCallback, useMemo, useState } from 'react';
import { useGlobal } from '@/state/Global/Context';
import { getBase64DataUrl } from '@/utils/helpers';

export type UnsplashImageMeta = {
  alt: string;
  src: `/photo-${string}`;
  origin: `${typeof UNSPLASH_URL}/photos${string}`;
  creator: `@${string}`;
  blurHash: string;
};

export type UnsplashImageProps = UnsplashImageMeta & {
  priority: boolean;
  fetchPriority: 'high' | 'low';
  width?: number;
  height?: number;
  fill?: boolean;
  loading?: 'eager' | 'lazy';
};

export default function UnsplashImage({
  src,
  alt,
  creator,
  origin,
  width,
  height,
  priority,
  fetchPriority,
  fill = false,
  blurHash,
  loading = 'lazy',
}: UnsplashImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { windowWidth } = useGlobal();

  if (!src || !alt || !creator || !origin) {
    throw new Error('Missing required props');
  }

  if (fill == false && (!width || !height)) {
    throw new Error('Missing required props');
  }

  const onLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Calculate optimal image width based on viewport and sizes attribute
  // sizes: 100vw up to 640px, 90vw up to 768px, 80vw up to 1024px, then 800px
  const imageWidth = useMemo(() => {
    if (windowWidth <= 640) return Math.min(windowWidth, 640);
    if (windowWidth <= 768) return Math.min(Math.floor(windowWidth * 0.9), 691);
    if (windowWidth <= 1024)
      return Math.min(Math.floor(windowWidth * 0.8), 819);
    return 800; // Max width as specified in sizes
  }, [windowWidth]);

  const imageClasses = [
    'object-cover',
    imageLoaded ? 'opacity-100' : 'opacity-0',
  ];
  // Create a custom loader that uses the actual height prop
  const loader = useMemo(() => {
    return unsplashLoader(height);
  }, [height]);

  const imageProps: ImageProps = {
    onLoad,
    loader,
    src,
    alt,
    priority,
    fetchPriority,
    fill,
    sizes:
      '(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 800px',
    unoptimized: false,
    placeholder: 'blur',
    blurDataURL: getBase64DataUrl('rgb(22, 22, 22)'),
    decoding: 'async',
    loading,
  };

  if (fill == false || (width && height)) {
    imageClasses.push('w-full h-auto');
    imageProps.width = imageWidth as number;
    imageProps.height = height as number;
  }

  imageProps.className = imageClasses.join(' ');

  const placeholder = useMemo(() => {
    if (imageLoaded || !blurHash) return null;

    return (
      <div className='absolute inset-0 overflow-hidden'>
        <div className='relative w-full h-full'>
          <Blurhash
            hash={blurHash ?? ''}
            className='w-full h-full overflow-hidden'
            width='100%'
            height='100%'
          />
        </div>
      </div>
    );
  }, [imageLoaded, blurHash]);

  return (
    <figure
      className='w-full h-48 sm:h-64 md:h-80 lg:h-96 flex relative'
      style={{ aspectRatio: width && height ? `${width}/${height}` : '9/16' }}
    >
      {placeholder}
      <Image {...imageProps} alt={alt} />
      <figcaption className='absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent flex justify-end'>
        <p className='text-white text-sm flex items-end gap-1 md:flex-col'>
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
            on Unsplash
          </Button>
        </p>
      </figcaption>
    </figure>
  );
}
