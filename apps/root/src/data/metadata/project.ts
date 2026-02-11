import { DOMAIN_URL, FULL_NAME, PROJECTS_LINK } from '@/utils/constants';
import { Metadata } from 'next';
import { AllowedProjectSlugs } from '@/types/base';
import { projectSlugs } from '@/data/project';
import { projectsRecords } from '../projectThumbnails';

export const projectRootMetadata: Metadata = {
  title: 'Projects | Daniel Joffe - Frontend Engineer',
  description: 'Projects | Daniel Joffe - Frontend Engineer',
  keywords: [
    'Daniel Joffe',
    'Portfolio',
    'Projects',
    'Case Studies',
    'Technical Solutions',
    'Web Applications',
    'React Projects',
    'Angular Projects',
    'Full-Stack Development',
    'Software Development',
    'Web Development',
    'Technical Implementation',
    'Project Showcase',
    'Code Examples',
  ],
  alternates: {
    canonical: '/projects',
  },
  openGraph: {
    title: `Daniel Joffe - Portfolio & Projects`,
    description: `A curated portfolio of case studies detailing goals, approach, and measurable outcomes.`,
    url: `https://danieljoffe.com/projects`,
    type: 'website',
    siteName: 'Daniel Joffe',
  },
  twitter: {
    title: `Daniel Joffe - Portfolio & Projects`,
    description: `Case studies highlighting goals, approach, and results across platforms and industries.`,
    card: 'summary_large_image',
    creator: '@danieljoffe',
  },
};

export const projectPagesMetadata: Record<AllowedProjectSlugs, Metadata> = {
  [projectSlugs.uiV1]: {
    title: 'Project | UI Components V1',
    description: projectsRecords[projectSlugs.uiV1].description,
    keywords: [
      'ui',
      'components',
      'design system',
      'accessibility',
      'react',
      'typescript',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.uiV1}`,
    },
    openGraph: {
      title: 'Project | UI Components V1',
      description: projectsRecords[projectSlugs.uiV1].description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.uiV1}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | UI Components V1',
      description: projectsRecords[projectSlugs.uiV1].description as string,
      card: 'summary_large_image',
    },
  },
  [projectSlugs.uiV2]: {
    title: 'Project | UI Components V2',
    description: projectsRecords[projectSlugs.uiV2].description,
    keywords: [
      'ui',
      'components',
      'design system',
      'accessibility',
      'react',
      'typescript',
      'form controls',
      'layout primitives',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.uiV2}`,
    },
    openGraph: {
      title: 'Project | UI Components V2',
      description: projectsRecords[projectSlugs.uiV2].description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.uiV2}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | UI Components V2',
      description: projectsRecords[projectSlugs.uiV2].description as string,
      card: 'summary_large_image',
    },
  },
  [projectSlugs.csPerformance]: {
    title: 'Project | Performance Optimization Case Study',
    description: projectsRecords[projectSlugs.csPerformance].description,
    keywords: [
      'performance',
      'optimization',
      'web vitals',
      'react',
      'lazy loading',
      'bundle splitting',
      'case study',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.csPerformance}`,
    },
    openGraph: {
      title: 'Project | Performance Optimization Case Study',
      description: projectsRecords[projectSlugs.csPerformance]
        .description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.csPerformance}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | Performance Optimization Case Study',
      description: projectsRecords[projectSlugs.csPerformance]
        .description as string,
      card: 'summary_large_image',
    },
  },
  [projectSlugs.csCLibrary]: {
    title: 'Project | Component Library Case Study',
    description: projectsRecords[projectSlugs.csCLibrary].description,
    keywords: [
      'component library',
      'design system',
      'react',
      'typescript',
      'documentation',
      'case study',
      'developer experience',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.csCLibrary}`,
    },
    openGraph: {
      title: 'Project | Component Library Case Study',
      description: projectsRecords[projectSlugs.csCLibrary]
        .description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.csCLibrary}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | Component Library Case Study',
      description: projectsRecords[projectSlugs.csCLibrary]
        .description as string,
      card: 'summary_large_image',
    },
  },
  [projectSlugs.csCMSTooling]: {
    title: 'Project | CMS Tooling Case Study',
    description: projectsRecords[projectSlugs.csCMSTooling].description,
    keywords: [
      'cms',
      'content management',
      'marketing',
      'landing pages',
      'case study',
      'developer productivity',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.csCMSTooling}`,
    },
    openGraph: {
      title: 'Project | CMS Tooling Case Study',
      description: projectsRecords[projectSlugs.csCMSTooling]
        .description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.csCMSTooling}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | CMS Tooling Case Study',
      description: projectsRecords[projectSlugs.csCMSTooling]
        .description as string,
      card: 'summary_large_image',
    },
  },
  [projectSlugs.csModernPractice]: {
    title: 'Project | Modern Practice Case Study',
    description: projectsRecords[projectSlugs.csModernPractice].description,
    keywords: [
      'modern web development',
      'best practices',
      'developer experience',
      'code quality',
      'case study',
      'web engineering',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.csModernPractice}`,
    },
    openGraph: {
      title: 'Project | Modern Practice Case Study',
      description: projectsRecords[projectSlugs.csModernPractice]
        .description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.csModernPractice}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | Modern Practice Case Study',
      description: projectsRecords[projectSlugs.csModernPractice]
        .description as string,
      card: 'summary_large_image',
    },
  },
  [projectSlugs.csA11y]: {
    title: 'Project | Accessibility Case Study (Serials)',
    description: projectsRecords[projectSlugs.csA11y].description,
    keywords: [
      'accessibility',
      'a11y',
      'inclusive design',
      'web accessibility',
      'case study',
      'wcag',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.csA11y}`,
    },
    openGraph: {
      title: 'Project | Accessibility Case Study (Serials)',
      description: projectsRecords[projectSlugs.csA11y].description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.csA11y}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | Accessibility Case Study (Serials)',
      description: projectsRecords[projectSlugs.csA11y].description as string,
      card: 'summary_large_image',
    },
  },
  [projectSlugs.csLogisticsDashboard]: {
    title: 'Project | Logistics Dashboard Case Study',
    description: projectsRecords[projectSlugs.csLogisticsDashboard].description,
    keywords: [
      'logistics',
      'dashboard',
      'next.js',
      'aws cognito',
      'rbac',
      'data visualization',
      'case study',
    ],
    authors: [{ name: FULL_NAME }],
    creator: FULL_NAME,
    publisher: FULL_NAME,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(DOMAIN_URL),
    alternates: {
      canonical: `${PROJECTS_LINK.href}/${projectSlugs.csLogisticsDashboard}`,
    },
    openGraph: {
      title: 'Project | Logistics Dashboard Case Study',
      description: projectsRecords[projectSlugs.csLogisticsDashboard]
        .description as string,
      url: `${DOMAIN_URL}${PROJECTS_LINK.href}/${projectSlugs.csLogisticsDashboard}`,
      type: 'article',
      siteName: FULL_NAME,
    },
    twitter: {
      title: 'Project | Logistics Dashboard Case Study',
      description: projectsRecords[projectSlugs.csLogisticsDashboard]
        .description as string,
      card: 'summary_large_image',
    },
  },
};
