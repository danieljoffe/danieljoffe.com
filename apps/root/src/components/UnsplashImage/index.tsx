'use client';

import { UnsplashImageMeta } from '@/types/postTypes';
import UnsplashFigure from './UnsplashFigure';
import UnsplashImg from './UnsplashImg';
import UnsplashAttribution from './UnsplashAttribution';

export type UnsplashImageProps = UnsplashImageMeta & {
  priority?: boolean;
  preload?: boolean;
  width?: number;
  height?: number;
  fill?: boolean;
  quality?: number;
  sizes?: string;
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
  sizes,
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
        {...(sizes ? { sizes } : {})}
      />
      <UnsplashAttribution creator={creator} />
    </UnsplashFigure>
  );
}

export { UnsplashFigure, UnsplashImg, UnsplashAttribution };
