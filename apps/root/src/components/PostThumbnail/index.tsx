'use client';

import { Link } from 'next-transition-router';
import { PostThumbnail as PostThumbnailType } from '@/types/postTypes';
import { analytics } from '@/lib/analytics';
import PostThumbnailDescription from './PostThumbnailDescription';
import UnsplashDecorativeAttribution from '../UnsplashImage/UnsplashDecorativeAttribution';
import { UnsplashFigure, UnsplashImg } from '../UnsplashImage';

export default function PostThumbnail({
  slug,
  cover,
  link,
  description,
  duration,
  role,
  index,
}: PostThumbnailType & { index: number }) {
  const handleClick = () => {
    if (link.href.includes('/projects/')) {
      analytics.projectClick(slug);
    } else if (link.href.includes('/experience/')) {
      analytics.experienceClick(slug);
    }
  };

  return (
    <article className='group flex flex-col h-full'>
      <Link
        href={link.href}
        onClick={handleClick}
        aria-label={`View ${link.label} project details`}
        className={[
          'flex flex-col h-full overflow-hidden rounded-md border border-border bg-card',
          'transition-[scale] duration-300 ease-in-out hover:outline-accent',
          'hover:scale-[1.025] hover:outline hover:outline-2 hover:outline-offset-2 hover:shadow-lg/12.5',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        ].join(' ')}
      >
        <div className='relative overflow-hidden'>
          <UnsplashFigure width={440} height={460}>
            <UnsplashImg
              src={cover.src}
              alt={cover.alt}
              width={440}
              height={460}
              quality={65}
              priority={index < 2}
            />
            <UnsplashDecorativeAttribution creator={cover.creator} />
          </UnsplashFigure>
        </div>

        <PostThumbnailDescription
          title={link.label as string}
          description={description as string}
          duration={duration as string}
          role={role as string}
        />
      </Link>
    </article>
  );
}
