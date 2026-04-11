import { AllowedProjectSlugs, ProjectStructuredData } from '@/types/base';
import { projectPageSlugs } from '@/data/project';
import { projectMdxMetadata } from '@/data/content/projects';
import { DOMAIN_URL, PROJECTS_LINK } from '@/utils/constants';
import {
  personStructuredData as author,
  CollectionPageStructuredData,
} from './base';

export const projectStructuredData = Object.fromEntries(
  projectPageSlugs.map(slug => {
    const meta = projectMdxMetadata[slug];
    return [
      slug,
      {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        about: meta.excerpt,
        headline: meta.title,
        author,
      },
    ];
  })
) as Record<AllowedProjectSlugs, ProjectStructuredData>;

export const projectsRootStructuredData: CollectionPageStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Projects | Daniel Joffe - Full-Stack Engineer',
  description:
    "The problems I've solved and how I solved them. Every case study has the challenge, the approach, and the measurable outcome.",
  url: `${DOMAIN_URL}${PROJECTS_LINK.href}`,
  author,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: projectPageSlugs.map((slug, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: projectMdxMetadata[slug].title,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${slug}`,
      description: projectMdxMetadata[slug].excerpt,
    })),
  },
};
