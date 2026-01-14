import { UNSPLASH_URL } from '@/utils/constants';
import { NavLink, WChildrenT } from './base';

export interface UnsplashImageMetaI {
  alt: string;
  src: `/photo-${string}`;
  origin: `${typeof UNSPLASH_URL}/photos${string}`;
  creator: `@${string}`;
  blurHash: string;
}

export interface PostBaseI {
  slug: string;
  title: string;
  description: string;
  cover: UnsplashImageMetaI;
  link: NavLink;
}

export interface PostThumbnailI extends PostBaseI {
  backgroundColor: string;
}

export interface PostBodyI extends WChildrenT {
  breadcrumbs: NavLink[];
  cover: UnsplashImageMetaI;
}
