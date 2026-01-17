'use client';

import { PostThumbnailI } from '@/types/post.types';
import UnsplashImage from '../UnsplashImage';
import { Link } from 'next-transition-router';
import PostThumbnailIDescription from './PostThumbnailDescription';
import { analytics } from '@/lib/analytics';

export default function PostThumbnail({
  slug,
  cover,
  link,
  backgroundColor,
  description,
  index,
}: PostThumbnailI & { index: number }) {
  const handleClick = () => {
    if (link.href.includes('/projects/')) {
      analytics.projectClick(slug);
    } else if (link.href.includes('/experience/')) {
      analytics.experienceClick(slug);
    }
  };

  return (
    <article
      key={slug}
      className={[
        'flex flex-col overflow-hidden rounded-md transition',
        'shadow-md/10 ease-in-out duration-300 h-full',
        'hover:scale-102 hover:shadow-lg/30',
      ].join(' ')}
    >
      <UnsplashImage
        src={cover.src}
        alt={cover.alt}
        origin={cover.origin}
        creator={cover.creator}
        blurHash={cover.blurHash}
        width={440}
        height={460}
        priority={index < 2}
        quality={65}
      />
      <Link
        href={link.href}
        onClick={handleClick}
        className={[
          'row-span-1 col-span-1 flex-1',
          'overflow-hidden shadow-lg',
          backgroundColor,
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
