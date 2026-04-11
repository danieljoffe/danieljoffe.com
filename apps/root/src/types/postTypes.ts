import { NavLink, WithChildren } from './base';

/**
 * Unsplash cover image metadata. Authored inside each MDX file's
 * `export const metadata` block — see {@link PostMetadata.cover}.
 */
export interface UnsplashImageMeta {
  alt: string;
  src: string;
  origin: string;
  creator: string;
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
  cover: UnsplashImageMeta;
  company?: string;
  role?: string;
  duration?: string;
  industry?: string;
  topic?: string;
  featured?: boolean;
  logo?: string;
  invert?: boolean;
  domain?: string;
}
