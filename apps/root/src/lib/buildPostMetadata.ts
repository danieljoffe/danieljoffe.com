import { Metadata } from 'next';
import { PostMetadata } from '@/types/postTypes';
import {
  DOMAIN_URL,
  FULL_NAME,
  PROJECTS_LINK,
  EXPERIENCE_LINK,
} from '@/utils/constants';

/**
 * Builds a full Next.js Metadata object from an MDX post's metadata export.
 * Centralises the boilerplate so each page only needs a one-liner.
 */
export function buildPostMetadata(meta: PostMetadata): Metadata {
  const basePath =
    meta.type === 'project' ? PROJECTS_LINK.href : EXPERIENCE_LINK.href;
  const label = meta.type === 'project' ? 'Project' : 'Experience';
  const pageTitle = `${label} | ${meta.title}`;
  const url = `${DOMAIN_URL}${basePath}/${meta.slug}`;

  return {
    title: pageTitle,
    description: meta.excerpt,
    keywords: meta.tags,
    authors: [{ name: meta.author }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${basePath}/${meta.slug}`,
    },
    openGraph: {
      title: pageTitle,
      description: meta.excerpt,
      url,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: pageTitle,
      description: meta.excerpt,
      card: 'summary_large_image',
    },
  };
}
