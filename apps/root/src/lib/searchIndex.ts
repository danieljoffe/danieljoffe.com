import { ContentType } from '@/types/postTypes';
import { contentTypeConfigs } from '@/data/contentTypeConfig';
import { projectsRecords } from '@/data/projectThumbnails';
import { experienceRecords } from '@/data/experienceThumbnails';
import { blogRecords } from '@/data/blogThumbnails';
import { projectMdxMetadata } from '@/data/content/projects';
import { experienceMdxMetadata } from '@/data/content/experience';
import { blogMdxMetadata } from '@/data/content/blog';
import {
  projectHistory,
  experienceHistory,
  blogHistory,
} from '@/data/contentOrder';
import { services } from '@/data/services';
import {
  HOME_LINK,
  ABOUT_LINK,
  SERVICES_LINK,
  AUDIT_LINK,
} from '@/utils/constants';

export interface SearchEntry {
  title: string;
  excerpt: string;
  tags: string[];
  category: string;
  type: 'project' | 'experience' | 'blog' | 'service' | 'page';
  slug: string;
  url: string;
}

function buildContentEntries<T extends string>(
  slugs: readonly T[],
  type: ContentType,
  thumbnails: Record<T, { title: string; description: string }>,
  metadata: Record<T, { tags?: string[]; category?: string } | undefined>
): SearchEntry[] {
  const basePath = contentTypeConfigs[type].basePath;
  return slugs.map(slug => ({
    title: thumbnails[slug].title,
    excerpt: thumbnails[slug].description,
    tags: metadata[slug]?.tags ?? [],
    category: metadata[slug]?.category ?? '',
    type,
    slug,
    url: `${basePath}/${slug}`,
  }));
}

/** Builds a flat, searchable index of all site content. */
export function buildSearchIndex(): SearchEntry[] {
  const contentEntries: SearchEntry[] = [
    ...buildContentEntries(
      projectHistory,
      'project',
      projectsRecords,
      projectMdxMetadata
    ),
    ...buildContentEntries(
      experienceHistory,
      'experience',
      experienceRecords,
      experienceMdxMetadata
    ),
    ...buildContentEntries(blogHistory, 'blog', blogRecords, blogMdxMetadata),
  ];

  const serviceEntries: SearchEntry[] = services.map(s => ({
    title: s.title,
    excerpt: s.description,
    tags: s.deliverables,
    category: 'Services',
    type: 'service' as const,
    slug: s.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    url: SERVICES_LINK.href,
  }));

  const pageEntries: SearchEntry[] = [
    {
      title: HOME_LINK.label,
      excerpt: 'Homepage — portfolio overview',
      tags: [],
      category: 'Pages',
      type: 'page' as const,
      slug: 'home',
      url: HOME_LINK.href,
    },
    {
      title: ABOUT_LINK.label,
      excerpt: 'About Daniel Joffe — background, skills, and philosophy',
      tags: [],
      category: 'Pages',
      type: 'page' as const,
      slug: 'about',
      url: ABOUT_LINK.href,
    },
    {
      title: SERVICES_LINK.label,
      excerpt: 'Freelance engineering services',
      tags: [],
      category: 'Pages',
      type: 'page' as const,
      slug: 'services',
      url: SERVICES_LINK.href,
    },
    {
      title: AUDIT_LINK.label,
      excerpt: 'Free automated accessibility and performance audit',
      tags: [],
      category: 'Pages',
      type: 'page' as const,
      slug: 'audit',
      url: AUDIT_LINK.href,
    },
  ];

  return [...contentEntries, ...serviceEntries, ...pageEntries];
}
