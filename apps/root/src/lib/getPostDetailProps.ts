import type { NavLink } from '@/types/base';
import { ContentType } from '@/types/postTypes';
import { contentTypeConfigs } from '@/data/contentTypeConfig';
import {
  getContentBySlug,
  getContentPagination,
  type ContentEntry,
} from '@/data/contentRegistry';
import { type PostPaginationData } from '@/data/contentOrder';

export interface PostDetailProps {
  entry: ContentEntry;
  pagination: PostPaginationData;
  breadcrumbs: NavLink[];
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

  return { entry, pagination, breadcrumbs };
}
