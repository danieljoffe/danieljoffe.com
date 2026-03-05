import { PostThumbnail as PostThumbnailType } from '@/types/postTypes';
import PostThumbnailLink from './PostThumbnailLink';
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
  return (
    <article className='group flex flex-col h-full'>
      <PostThumbnailLink href={link.href} slug={slug}>
        <div className='relative overflow-hidden'>
          <UnsplashFigure width={160} height={173}>
            <UnsplashImg
              src={cover.src}
              alt={cover.alt}
              width={160}
              height={173}
              quality={33}
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
      </PostThumbnailLink>
    </article>
  );
}
