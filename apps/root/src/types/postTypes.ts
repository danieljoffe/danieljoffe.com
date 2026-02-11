import { UNSPLASH_URL } from '@/utils/constants';
import { NavLink, WithChildren } from './base';

export interface UnsplashImageMeta {
  alt: string;
  src: `/photo-${string}`;
  origin: `${typeof UNSPLASH_URL}/photos${string}`;
  creator: `@${string}`;
  blurHash: string;
}

export interface PostBase {
  slug: string;
  title: string;
  description: string;
  cover: UnsplashImageMeta;
  link: NavLink;
}

export interface PostThumbnail extends PostBase {
  backgroundColor?: string;
  duration?: string;
  role?: string;
}

export interface PostBodyProps extends WithChildren {
  breadcrumbs: NavLink[];
  cover: UnsplashImageMeta;
}
