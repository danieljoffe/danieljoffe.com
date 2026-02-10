import { UNSPLASH_URL } from '@/utils/constants';
import { NavLinkI, WChildrenT } from './base';

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
  link: NavLinkI;
}

export interface PostThumbnailI extends PostBaseI {
  backgroundColor?: string;
  duration?: string;
  role?: string;
}

export interface PostBodyI extends WChildrenT {
  breadcrumbs: NavLinkI[];
  cover: UnsplashImageMetaI;
}
