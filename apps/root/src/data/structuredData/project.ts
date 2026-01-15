import { AllowedProjectSlugs, ProjectStructuredDataI } from '@/types/base';
import { projectSlugs, projectPageSlugs } from '@/data/project';
import { projectsRecords } from '@/data/projectThumbnails';
import {
  personStructuredData as author,
  CollectionPageStructuredData,
} from './base';
import { DOMAIN_URL } from '@/utils/constants';
import { PROJECTS_LINK } from '@/utils/base';

export const projectStructuredData: Record<
  AllowedProjectSlugs,
  ProjectStructuredDataI
> = {
  [projectSlugs.uiV1]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.uiV1].description,
    headline: projectsRecords[projectSlugs.uiV1].title,
    author,
  },
  [projectSlugs.csPerformance]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csPerformance].description,
    headline: projectsRecords[projectSlugs.csPerformance].title,
    author,
  },
  [projectSlugs.csCLibrary]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csCLibrary].description,
    headline: projectsRecords[projectSlugs.csCLibrary].title,
    author,
  },
  [projectSlugs.csCMSTooling]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csCMSTooling].description,
    headline: projectsRecords[projectSlugs.csCMSTooling].title,
    author,
  },
  [projectSlugs.csModernPractice]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csModernPractice].description,
    headline: projectsRecords[projectSlugs.csModernPractice].title,
    author,
  },
  [projectSlugs.csA11y]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csA11y].description,
    headline: projectsRecords[projectSlugs.csA11y].title,
    author,
  },
  [projectSlugs.csLogisticsDashboard]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csLogisticsDashboard].description,
    headline: projectsRecords[projectSlugs.csLogisticsDashboard].title,
    author,
  },
};

export const projectsRootStructuredData: CollectionPageStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: 'Projects | Daniel Joffe - Frontend Engineer',
  description:
    'Case studies and projects showcasing performance optimization, component architecture, and full-stack development. Each project includes the challenge, my approach, and measurable outcomes.',
  url: `${DOMAIN_URL}${PROJECTS_LINK.href}`,
  author,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: projectPageSlugs.map((slug, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: projectsRecords[slug].title,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${slug}`,
      description: projectsRecords[slug].description as string,
    })),
  },
};
