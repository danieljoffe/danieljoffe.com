import { PostBodyProps } from '@/types/postTypes';
import UnsplashImage from './UnsplashImage';
import PostContent from './PostContent';
import BreadCrumbs from './BreadCrumbs';

export default function PostBody({
  children,
  cover,
  breadcrumbs,
}: PostBodyProps) {
  return (
    <div className='flex flex-col gap-4'>
      <BreadCrumbs items={breadcrumbs} />
      <UnsplashImage
        src={cover.src}
        alt={cover.alt}
        origin={cover.origin}
        creator={cover.creator}
        blurHash={cover.blurHash}
        width={512}
        height={288}
        preload={true}
        sizes='(max-width: 640px) calc(100vw - 2rem), (max-width: 720px) calc(100vw - 3rem), 720px'
      />
      <PostContent>{children}</PostContent>
    </div>
  );
}
