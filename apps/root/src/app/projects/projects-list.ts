import { Metadata } from 'next';
import { UnsplashImageMeta } from '@/components/assembled/UnsplashImage';
import { NavLink } from '@/types/base';

export const uiComponentsV1Slug = 'ui-components-v1' as const;
export const caseStudyPerformance = 'performance-case-study' as const;
export const caseStudyComponentLibrary =
  'component-library-case-study' as const;
export const caseStudyCMSTooling = 'cms-tooling-case-study' as const;
export const caseStudyAccessibilitySerials = 'a11y-serials-case-study' as const;
export const caseStudyModernPractice = 'modern-practice-case-study' as const;
export const caseStudyLogisticsDashboard =
  'logistics-dashboard-case-study' as const;

export const allowedPages = [
  uiComponentsV1Slug,
  caseStudyPerformance,
  caseStudyComponentLibrary,
  caseStudyCMSTooling,
  caseStudyAccessibilitySerials,
  caseStudyLogisticsDashboard,
  caseStudyModernPractice,
] as const;

export type AllowedPages = (typeof allowedPages)[number];
export type ProjectInfo = Pick<Metadata, 'description'> & {
  slug: string;
  backgroundColor: string;
  link: NavLink;
  cover: UnsplashImageMeta;
};
export type AllowedPagesRecord = Record<AllowedPages, ProjectInfo>;
