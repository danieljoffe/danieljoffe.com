import { PostBodyI } from '@/types/post.types';
import UnsplashImage from './UnsplashImage';
import PostContent from './PostContent';
import BreadCrumbs from './BreadCrumbs';

export default function PostBody({ children, cover, breadcrumbs }: PostBodyI) {
  return (
    <div className='flex flex-col gap-4'>
      <BreadCrumbs items={breadcrumbs} />

      <div className='flex flex-col'>
        <UnsplashImage
          src={cover.src}
          alt={cover.alt}
          origin={cover.origin}
          creator={cover.creator}
          blurHash={cover.blurHash}
          width={800}
          height={450}
          priority={true}
        />
        <PostContent>{children}</PostContent>
      </div>
    </div>
  );
}
