import { ImageLoader } from 'next/image';
import { UNSPLASH_PHOTOS_URL } from './constants';

// Custom loader that uses ratioWidth/ratioHeight for aspect ratio only.
// The actual request width comes from Next.js (based on sizes + viewport).
// auto=compress defaults to perceptual q=45; explicit q overrides it downward
// for thumbnails where aggressive compression is acceptable.
const unsplashLoader = (
  ratioWidth?: number,
  ratioHeight?: number
): ImageLoader => {
  return ({ src, width: dynamicWidth, quality }) => {
    const width = dynamicWidth || 800;
    const aspectRatio =
      ratioWidth && ratioHeight ? ratioHeight / ratioWidth : 9 / 16;
    const height = Math.floor(width * aspectRatio);
    const url = new URL(UNSPLASH_PHOTOS_URL);

    url.pathname = src;
    url.searchParams.set('w', width.toString());
    url.searchParams.set('h', height.toString());
    url.searchParams.set('auto', 'format,compress');
    url.searchParams.set('fit', 'crop');
    url.searchParams.set('crop', 'faces,focalpoint');
    url.searchParams.set('cs', 'strip');
    // Only set explicit quality when below auto=compress default (45)
    if (quality && quality < 45) {
      url.searchParams.set('q', quality.toString());
    }
    return url.toString();
  };
};

export default unsplashLoader;
