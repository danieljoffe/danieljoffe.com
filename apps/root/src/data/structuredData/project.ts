import { AllowedProjectSlugs, ProjectStructuredData } from '@/types/base';
import { projectSlugs, projectPageSlugs } from '@/data/project';
import { projectsRecords } from '@/data/projectThumbnails';
import { DOMAIN_URL, PROJECTS_LINK } from '@/utils/constants';
import {
  personStructuredData as author,
  CollectionPageStructuredData,
} from './base';

export const projectStructuredData: Record<
  AllowedProjectSlugs,
  ProjectStructuredData
> = {
  [projectSlugs.uiV1]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.uiV1].description,
    headline: projectsRecords[projectSlugs.uiV1].title,
    author,
  },
  [projectSlugs.uiV2]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.uiV2].description,
    headline: projectsRecords[projectSlugs.uiV2].title,
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
  [projectSlugs.csContactForm]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csContactForm].description,
    headline: projectsRecords[projectSlugs.csContactForm].title,
    author,
  },
  [projectSlugs.csAppContext]: {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    about: projectsRecords[projectSlugs.csAppContext].description,
    headline: projectsRecords[projectSlugs.csAppContext].title,
    author,
  },
};

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
      name: projectsRecords[slug].title,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${slug}`,
      description: projectsRecords[slug].description as string,
    })),
  },
};
