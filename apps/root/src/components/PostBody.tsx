import { PostBodyI } from '@/types/post.types';
import UnsplashImage from './assembled/UnsplashImage';
import PostContent from './PostContent';
import BreadCrumbs from './units/BreadCrumbs';

export default function PostBody({ children, cover, breadcrumbs }: PostBodyI) {
  return (
    <div className='flex flex-col gap-4'>
      <BreadCrumbs items={breadcrumbs} />
      <div className='flex flex-col gap-12'>
        <UnsplashImage
          src={cover.src}
          alt={cover.alt}
          origin={cover.origin}
          creator={cover.creator}
          priority={true}
          fetchPriority='high'
          blurHash={cover.blurHash}
          width={800}
          height={450}
        />
        <PostContent>{children}</PostContent>
      </div>
    </div>
  );
}
