import { ImageLoader } from 'next/image';
import { UNSPLASH_PHOTOS_URL } from './constants';

// Default quality for web images (75 provides good balance of quality/size)
const DEFAULT_QUALITY = 75;

// Custom loader that can accept height parameter
const unsplashLoader = (
  ratioWidth?: number,
  ratioHeight?: number
): ImageLoader => {
  return ({ src, width: dynamicWidth, quality }) => {
    const width = ratioWidth ?? dynamicWidth ?? 800;
    const height = ratioHeight ?? Math.floor(width * (9 / 16));
    const url = new URL(UNSPLASH_PHOTOS_URL);

    url.pathname = src;
    url.searchParams.set('w', width.toString());
    url.searchParams.set('h', height.toString());
    url.searchParams.set('q', (quality ?? DEFAULT_QUALITY).toString());
    url.searchParams.set('auto', 'format,compress');
    url.searchParams.set('fit', 'crop');
    // Smart cropping based on image content
    url.searchParams.set('crop', 'faces,focalpoint');
    return url.toString();
  };
};

export default unsplashLoader;
