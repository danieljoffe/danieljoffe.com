import { PostThumbnailI } from '@/types/post.types';
import UnsplashImage from '../assembled/UnsplashImage';
import { Link } from 'next-transition-router';
import PostThumbnailIDescription from './PostThumbnailDescription';

export default function PostThumbnail({
  slug,
  cover,
  link,
  backgroundColor,
  description,
  index,
}: PostThumbnailI & { index: number }) {
  return (
    <article
      key={slug}
      className={[
        'flex flex-col overflow-hidden rounded-md transition',
        'shadow-md/10 ease-in-out duration-300',
        'hover:scale-102 hover:shadow-lg/30',
      ].join(' ')}
    >
      <UnsplashImage
        src={cover.src}
        alt={cover.alt}
        origin={cover.origin}
        creator={cover.creator}
        priority={index < 2}
        fetchPriority={index < 2 ? 'high' : 'low'}
        blurHash={cover.blurHash}
        width={400}
        height={225}
      />
      <Link
        href={link.href}
        className={[
          'row-span-1 col-span-1',
          backgroundColor,
          'overflow-hidden',
          'shadow-lg',
        ].join(' ')}
        aria-label={`View ${link.label} project details`}
      >
        <PostThumbnailIDescription
          title={link.label as string}
          description={description as string}
        />
      </Link>
    </article>
  );
}
