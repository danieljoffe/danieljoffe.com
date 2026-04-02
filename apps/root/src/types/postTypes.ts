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
  readingTime?: number;
  featured?: boolean;
}

export interface PostBodyProps extends WithChildren {
  breadcrumbs: NavLink[];
  cover: UnsplashImageMeta;
  title: string;
  date: string;
  tags: string[];
  readingTime: number;
  backLink: NavLink;
}

/** Source-of-truth metadata exported from each MDX content file. */
export interface PostMetadata {
  title: string;
  date: string;
  excerpt: string;
  author: string;
  category: string;
  tags: string[];
  slug: string;
  type: 'project' | 'experience' | (string & {});
  company?: string;
  role?: string;
  duration?: string;
  industry?: string;
}
