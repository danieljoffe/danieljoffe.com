import { UNSPLASH_URL } from '@/utils/constants';
import { NavLink, WithChildren } from './base';

export interface UnsplashImageMeta {
  alt: string;
  src: `/photo-${string}`;
  origin: `${typeof UNSPLASH_URL}/photos${string}`;
  creator: `@${string}`;
}

export interface PostBase {
  slug: string;
  title: string;
  description: string;
  cover: UnsplashImageMeta;
  link: Pick<NavLink, 'href'>;
}

export interface PostThumbnail extends PostBase {
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
}

/** Supported content types in the content registry. */
export type ContentType = 'project' | 'experience' | 'blog';

/** Configuration for a content type (basePath, label, content directory). */
export interface ContentTypeConfig {
  type: ContentType;
  basePath: string;
  label: string;
  contentDir: string;
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
  type: ContentType | (string & {});
  company?: string;
  role?: string;
  duration?: string;
  industry?: string;
  topic?: string;
}
