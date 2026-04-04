import { AllowedBlogSlugs } from '@/types/base';
import { PostThumbnail } from '@/types/postTypes';
import { BLOG_LINK, UNSPLASH_URL } from '@/utils/constants';
import { blogSlugs } from '@/data/blog';

export const blogRecords: Record<AllowedBlogSlugs, PostThumbnail> = {
  [blogSlugs.unifiedContentPipeline]: {
    slug: blogSlugs.unifiedContentPipeline,
    title: 'Building a Unified Content Pipeline with Next.js and MDX',
    description:
      'How I refactored from duplicated per-type data files to a single content registry, cutting the cost of adding new content types from 6+ files to 3.',
    link: {
      label: 'Unified Content Pipeline',
      href: `${BLOG_LINK.href}/${blogSlugs.unifiedContentPipeline}`,
    },
    cover: {
      alt: 'An abstract network of connected nodes glowing in blue',
      src: '/photo-1558494949-ef010cbdcc31',
      origin: `${UNSPLASH_URL}/photos/close-up-photography-of-computer-motherboard-iar-afB0QQw`,
      creator: '@jordanharrison',
      blurHash: 'L25E{Jxu00Rj~qof%Mt700ay-;WB',
    },
  },
};
