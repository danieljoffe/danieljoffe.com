import type { NavLink } from '@/types/base';
import { ContentType, type PostPaginationData } from '@/types/postTypes';
import { contentTypeConfigs } from '@/data/contentTypeConfig';
import {
  getContentBySlug,
  getContentPagination,
  type ContentEntry,
} from '@/data/contentRegistry';

export interface PostDetailProps {
  entry: ContentEntry;
  pagination: PostPaginationData;
  breadcrumbs: NavLink[];
  /** Shared `view-transition-name` so the cover morphs from its card. */
  coverTransitionName: string;
}

/**
 * Assembles all data needed to render a content detail page.
 * Returns null if the slug doesn't exist for the given type.
 */
export function getPostDetailProps(
  type: ContentType,
  slug: string
): PostDetailProps | null {
  const entry = getContentBySlug(type, slug);
  if (!entry) return null;

  const config = contentTypeConfigs[type];
  const pagination = getContentPagination(type, slug);

  const breadcrumbs: NavLink[] = [
    { href: config.basePath, label: config.label },
    { href: `${config.basePath}/${slug}`, label: entry.thumbnail.title },
  ];

  return {
    entry,
    pagination,
    breadcrumbs,
    coverTransitionName: `cover-${type}-${slug}`,
  };
}
