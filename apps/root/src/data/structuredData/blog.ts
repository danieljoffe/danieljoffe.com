import { AllowedBlogSlugs, BlogStructuredData } from '@/types/base';
import { blogPageSlugs } from '@/data/blog';
import { DOMAIN_URL, BLOG_LINK, FULL_NAME } from '@/utils/constants';
import { blogMdxMetadata } from '@/data/content/blog';
import {
  personStructuredData as author,
  CollectionPageStructuredData,
} from './base';

export const blogStructuredData = Object.fromEntries(
  blogPageSlugs.map(slug => {
    const meta = blogMdxMetadata[slug];
    return [
      slug,
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: meta.title,
        description: meta.excerpt,
        datePublished: meta.date,
        author,
      },
    ];
  })
) as Record<AllowedBlogSlugs, BlogStructuredData>;

export const blogRootStructuredData: CollectionPageStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: `Blog | ${FULL_NAME} - Full-Stack Engineer`,
  description:
    "Notes from shipping code. Deep-dives on the problems I've debugged, the patterns I've extracted, and the decisions I'd make differently next time.",
  url: `${DOMAIN_URL}${BLOG_LINK.href}`,
  author,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: blogPageSlugs.map((slug, index) => ({
      '@type': 'ListItem' as const,
      position: index + 1,
      name: blogMdxMetadata[slug].title,
      url: `${DOMAIN_URL}${BLOG_LINK.href}/${slug}`,
      description: blogMdxMetadata[slug].excerpt,
    })),
  },
};
