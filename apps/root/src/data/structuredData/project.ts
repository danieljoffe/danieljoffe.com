import { AllowedProjectSlugs, ProjectStructuredDataI } from '@/types/base';
import { projectSlugs } from '@/data/project';
import { projectsRecords } from '@/data/projectThumbnails';
import { personStructuredData as author } from './base';

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
