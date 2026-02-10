'use client';

import { UNSPLASH_URL } from '@/utils/constants';
import UnsplashFigure from './UnsplashFigure';
import UnsplashImg from './UnsplashImg';
import UnsplashAttribution from './UnsplashAttribution';

export type UnsplashImageMeta = {
  alt: string;
  src: `/photo-${string}`;
  origin: `${typeof UNSPLASH_URL}/photos${string}`;
  creator: `@${string}`;
  blurHash: string;
};

export type UnsplashImageProps = UnsplashImageMeta & {
  priority?: boolean;
  preload?: boolean;
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
  preload = false,
}: UnsplashImageProps) {
  if (!src || !alt || !creator || !origin) {
    throw new Error('Missing required props');
  }

  if (fill == false && (!width || !height)) {
    throw new Error('Missing required props');
  }

  const dimensions = width != null && height != null ? { width, height } : {};

  return (
    <UnsplashFigure {...dimensions}>
      <UnsplashImg
        src={src}
        alt={alt}
        {...dimensions}
        quality={quality}
        priority={priority}
        fill={fill}
        preload={preload}
      />
      <UnsplashAttribution creator={creator} origin={origin} />
    </UnsplashFigure>
  );
}

export { UnsplashFigure, UnsplashImg, UnsplashAttribution };
