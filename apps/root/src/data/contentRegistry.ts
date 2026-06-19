import { ComponentType } from 'react';
import {
  ProjectStructuredData,
  ExperienceStructuredData,
  BlogStructuredData,
} from '@/types/base';
import {
  ContentType,
  PostMetadata,
  PostThumbnail,
  type PostPaginationData,
} from '@/types/postTypes';
import { contentTypeConfigs } from '@/data/contentTypeConfig';
import { buildThumbnail } from '@/data/buildThumbnail';
import {
  projectMdxComponents,
  projectMdxMetadata,
} from '@/data/content/projects';
import {
  experienceMdxComponents,
  experienceMdxMetadata,
} from '@/data/content/experience';
import { blogMdxComponents, blogMdxMetadata } from '@/data/content/blog';
import { projectStructuredData } from '@/data/structuredData/project';
import { experienceStructuredData } from '@/data/structuredData/experience';
import { blogStructuredData } from '@/data/structuredData/blog';
import {
  projectReadingTimes,
  experienceReadingTimes,
  blogReadingTimes,
} from '@/data/readingTimes';

export type ContentStructuredData =
  | ProjectStructuredData
  | ExperienceStructuredData
  | BlogStructuredData;

export interface ContentEntry {
  slug: string;
  type: ContentType;
  thumbnail: PostThumbnail;
  component: ComponentType;
  metadata: PostMetadata;
  structuredData: ContentStructuredData;
  readingTime: number;
}

// ---------------------------------------------------------------------------
// Build the registry from MDX metadata (the single source of truth)
// ---------------------------------------------------------------------------

/**
 * Builds the display-ordered entries for one content type.
 *
 * Display order is the `order` field on each post's MDX metadata (ascending),
 * with the slug as a stable tie-breaker so a collision can never silently
 * shuffle output. `order` must be present and unique within a type — a missing
 * or duplicate value would make structured-data ItemList positions and prev/next
 * pagination non-deterministic — so both are asserted here at module load, which
 * fails the build (and is covered by the registry unit test).
 */
function buildEntries<Slug extends string>(
  type: ContentType,
  components: Record<Slug, ComponentType>,
  metadataMap: Record<Slug, PostMetadata>,
  readingTimes: Record<Slug, number>,
  structuredData: Record<Slug, ContentStructuredData>
): ContentEntry[] {
  const slugs = (Object.keys(metadataMap) as Slug[]).sort(
    (a, b) => metadataMap[a].order - metadataMap[b].order || a.localeCompare(b)
  );

  const seenOrder = new Map<number, string>();
  for (const slug of slugs) {
    const { order } = metadataMap[slug];
    if (typeof order !== 'number' || !Number.isFinite(order)) {
      throw new Error(
        `Content "${type}/${slug}" is missing a numeric \`order\` in its MDX metadata.`
      );
    }
    const clash = seenOrder.get(order);
    if (clash) {
      throw new Error(
        `Duplicate \`order\` ${order} for type "${type}": "${clash}" and "${slug}". Each post needs a unique order.`
      );
    }
    seenOrder.set(order, slug);
  }

  return slugs.map(slug => {
    const metadata = metadataMap[slug];
    const readingTime = readingTimes[slug];
    return {
      slug,
      type,
      thumbnail: buildThumbnail(metadata, readingTime),
      component: components[slug],
      metadata,
      structuredData: structuredData[slug],
      readingTime,
    };
  });
}

const entries: ContentEntry[] = [
  ...buildEntries(
    'project',
    projectMdxComponents,
    projectMdxMetadata,
    projectReadingTimes,
    projectStructuredData
  ),
  ...buildEntries(
    'experience',
    experienceMdxComponents,
    experienceMdxMetadata,
    experienceReadingTimes,
    experienceStructuredData
  ),
  ...buildEntries(
    'blog',
    blogMdxComponents,
    blogMdxMetadata,
    blogReadingTimes,
    blogStructuredData
  ),
];

// Lookup maps for O(1) access
const byTypeAndSlug = new Map<string, ContentEntry>();
const byType = new Map<ContentType, ContentEntry[]>();

for (const entry of entries) {
  byTypeAndSlug.set(`${entry.type}:${entry.slug}`, entry);
  const list = byType.get(entry.type) ?? [];
  list.push(entry);
  byType.set(entry.type, list);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Returns all entries for a content type, in display order. */
export function getContentByType(type: ContentType): ContentEntry[] {
  return byType.get(type) ?? [];
}

/** Returns a single entry by type and slug. */
export function getContentBySlug(
  type: ContentType,
  slug: string
): ContentEntry | undefined {
  return byTypeAndSlug.get(`${type}:${slug}`);
}

/** Returns all slugs for a content type (for generateStaticParams). */
export function getContentSlugs(type: ContentType): string[] {
  return getContentByType(type).map(e => e.slug);
}

/** Returns prev/next pagination for a given slug within its type. */
export function getContentPagination(
  type: ContentType,
  slug: string
): PostPaginationData {
  const config = contentTypeConfigs[type];
  const typeEntries = getContentByType(type);
  const index = typeEntries.findIndex(e => e.slug === slug);
  const len = typeEntries.length;

  const prevIndex = (index - 1 + len) % len;
  const nextIndex = (index + 1) % len;

  return {
    prev: {
      slug: typeEntries[prevIndex].slug,
      title: typeEntries[prevIndex].thumbnail.title,
      href: `${config.basePath}/${typeEntries[prevIndex].slug}`,
    },
    next: {
      slug: typeEntries[nextIndex].slug,
      title: typeEntries[nextIndex].thumbnail.title,
      href: `${config.basePath}/${typeEntries[nextIndex].slug}`,
    },
  };
}

/** Returns the reading time for a specific entry. */
export function getContentReadingTime(type: ContentType, slug: string): number {
  return getContentBySlug(type, slug)?.readingTime ?? 0;
}

/** Returns all entries across all content types. */
export function getAllContent(): ContentEntry[] {
  return entries;
}
