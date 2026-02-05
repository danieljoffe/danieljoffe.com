import { PostBodyI } from '@/types/postTypes';
import UnsplashImage from './UnsplashImage';
import PostContent from './PostContent';
import BreadCrumbs from './BreadCrumbs';
import { Stack } from '@danieljoffe.com/ui';

export default function PostBody({ children, cover, breadcrumbs }: PostBodyI) {
  return (
    <Stack>
      <BreadCrumbs items={breadcrumbs} />
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
    </Stack>
  );
}
