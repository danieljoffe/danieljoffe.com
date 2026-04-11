import { ContentType, PostMetadata, PostThumbnail } from '@/types/postTypes';
import { contentTypeConfigs } from '@/data/contentTypeConfig';

/**
 * Derives a {@link PostThumbnail} from MDX metadata. MDX is the single source
 * of truth for every content field that appears on listing cards, OG images,
 * and structured data — this helper is the only place thumbnail shapes are
 * assembled.
 */
export function buildThumbnail(
  metadata: PostMetadata,
  readingTime: number
): PostThumbnail {
  const basePath = contentTypeConfigs[metadata.type as ContentType].basePath;
  const thumbnail: PostThumbnail = {
    slug: metadata.slug,
    title: metadata.title,
    description: metadata.excerpt,
    cover: metadata.cover,
    link: { href: `${basePath}/${metadata.slug}` },
    readingTime,
  };
  if (metadata.role !== undefined) thumbnail.role = metadata.role;
  if (metadata.duration !== undefined) thumbnail.duration = metadata.duration;
  if (metadata.featured !== undefined) thumbnail.featured = metadata.featured;
  return thumbnail;
}
