import Image from 'next/image';

export function CoverImage({
  src,
  alt,
  priority = false,
  coverName,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  /**
   * Shared identity for the View Transition morph. Rendered as `data-cover-name`
   * so the navigation layer can tag this cover with a matching
   * `view-transition-name` when it morphs to/from a detail-page hero.
   */
  coverName?: string | undefined;
}) {
  return (
    <div className='relative h-36 overflow-hidden' data-cover-name={coverName}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes='(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'low'}
        className='object-cover'
      />
      <div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
    </div>
  );
}
