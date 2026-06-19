import { NavLink, WithChildren } from './base';

/**
 * Cover image metadata. Authored inside each MDX file's
 * `export const metadata` block — see {@link PostMetadata.cover}.
 */
export interface CoverImageMeta {
  alt: string;
  src: string;
}

export interface PostBase {
  slug: string;
  title: string;
  description: string;
  cover: CoverImageMeta;
  link: Pick<NavLink, 'href'>;
}

export interface PostThumbnail extends PostBase {
  duration?: string;
  role?: string;
  readingTime?: number;
  featured?: boolean;
  tags?: string[];
}

export interface PostBodyProps extends WithChildren {
  breadcrumbs: NavLink[];
  cover: CoverImageMeta;
  title: string;
  date: string;
  tags: string[];
  readingTime: number;
}

/** A single prev/next pagination link within a content type. */
export interface PaginationLink {
  slug: string;
  title: string;
  href: string;
}

/** Prev/next pagination pair for a content detail page. */
export interface PostPaginationData {
  prev: PaginationLink;
  next: PaginationLink;
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
  /**
   * Per-type display sort key (ascending). Authored as sparse multiples of 10
   * so new posts can be slotted between existing ones without renumbering.
   * The content registry sorts each type by this; uniqueness is enforced at
   * build time (see contentRegistry) and in the registry unit test.
   */
  order: number;
  excerpt: string;
  author: string;
  category: string;
  tags: string[];
  slug: string;
  type: ContentType | (string & {});
  cover: CoverImageMeta;
  company?: string;
  role?: string;
  duration?: string;
  industry?: string;
  featured?: boolean;
  logo?: string;
  invert?: boolean;
  domain?: string;
}
