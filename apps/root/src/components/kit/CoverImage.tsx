import { UnsplashImg } from '@/components/UnsplashImage';

export function CoverImage({
  src,
  alt,
  priority = false,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  return (
    <div className='relative h-36 overflow-hidden'>
      <UnsplashImg
        src={src}
        alt={alt}
        fill
        sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
        priority={priority}
      />
      <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
    </div>
  );
}
