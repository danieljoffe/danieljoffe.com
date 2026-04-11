import { ComponentType } from 'react';
import {
  ProjectStructuredData,
  ExperienceStructuredData,
  BlogStructuredData,
} from '@/types/base';
import { ContentType, PostMetadata, PostThumbnail } from '@/types/postTypes';
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
  projectHistory,
  experienceHistory,
  blogHistory,
  type PostPaginationData,
} from '@/data/contentOrder';
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

function buildProjectEntries(): ContentEntry[] {
  return projectHistory.map(slug => {
    const metadata = projectMdxMetadata[slug];
    const readingTime = projectReadingTimes[slug];
    return {
      slug,
      type: 'project' as const,
      thumbnail: buildThumbnail(metadata, readingTime),
      component: projectMdxComponents[slug],
      metadata,
      structuredData: projectStructuredData[slug],
      readingTime,
    };
  });
}

function buildExperienceEntries(): ContentEntry[] {
  return experienceHistory.map(slug => {
    const metadata = experienceMdxMetadata[slug];
    const readingTime = experienceReadingTimes[slug];
    return {
      slug,
      type: 'experience' as const,
      thumbnail: buildThumbnail(metadata, readingTime),
      component: experienceMdxComponents[slug],
      metadata,
      structuredData: experienceStructuredData[slug],
      readingTime,
    };
  });
}

function buildBlogEntries(): ContentEntry[] {
  return blogHistory.map(slug => {
    const metadata = blogMdxMetadata[slug];
    const readingTime = blogReadingTimes[slug];
    return {
      slug,
      type: 'blog' as const,
      thumbnail: buildThumbnail(metadata, readingTime),
      component: blogMdxComponents[slug],
      metadata,
      structuredData: blogStructuredData[slug],
      readingTime,
    };
  });
}

const entries: ContentEntry[] = [
  ...buildProjectEntries(),
  ...buildExperienceEntries(),
  ...buildBlogEntries(),
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
