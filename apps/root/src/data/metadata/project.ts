import { DOMAIN_URL, FULL_NAME } from '@/utils/constants';
import { PROJECTS_LINK } from '@/components/assembled/Nav/Links';
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
      images: [
        {
          url: projectsRecords[projectSlugs.uiV1].cover.src,
          width: 4042,
          height: 2695,
          alt: 'UI Components V1',
        },
      ],
    },
    twitter: {
      images: [
        projectsRecords[projectSlugs.uiV1].cover.src,
        {
          url: projectsRecords[projectSlugs.uiV1].cover.src,
          width: 4042,
          height: 2695,
          alt: 'UI Components V1',
        },
      ],
      title: 'Project | UI Components V1',
      description: projectsRecords[projectSlugs.uiV1].description as string,
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
      images: [
        {
          url: projectsRecords[projectSlugs.csPerformance].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Performance Optimization Case Study',
        },
      ],
    },
    twitter: {
      images: [
        projectsRecords[projectSlugs.csPerformance].cover.src,
        {
          url: projectsRecords[projectSlugs.csPerformance].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Performance Optimization Case Study',
        },
      ],
      title: 'Project | Performance Optimization Case Study',
      description: projectsRecords[projectSlugs.csPerformance]
        .description as string,
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
      images: [
        {
          url: projectsRecords[projectSlugs.csCLibrary].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Component Library Case Study',
        },
      ],
    },
    twitter: {
      images: [
        projectsRecords[projectSlugs.csCLibrary].cover.src,
        {
          url: projectsRecords[projectSlugs.csCLibrary].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Component Library Case Study',
        },
      ],
      title: 'Project | Component Library Case Study',
      description: projectsRecords[projectSlugs.csCLibrary]
        .description as string,
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
      images: [
        {
          url: projectsRecords[projectSlugs.csCMSTooling].cover.src,
          width: 4042,
          height: 2695,
          alt: 'CMS Tooling Case Study',
        },
      ],
    },
    twitter: {
      images: [
        projectsRecords[projectSlugs.csCMSTooling].cover.src,
        {
          url: projectsRecords[projectSlugs.csCMSTooling].cover.src,
          width: 4042,
          height: 2695,
          alt: 'CMS Tooling Case Study',
        },
      ],
      title: 'Project | CMS Tooling Case Study',
      description: projectsRecords[projectSlugs.csCMSTooling]
        .description as string,
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
      images: [
        {
          url: projectsRecords[projectSlugs.csModernPractice].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Modern Practice Case Study',
        },
      ],
    },
    twitter: {
      images: [
        projectsRecords[projectSlugs.csModernPractice].cover.src,
        {
          url: projectsRecords[projectSlugs.csModernPractice].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Modern Practice Case Study',
        },
      ],
      title: 'Project | Modern Practice Case Study',
      description: projectsRecords[projectSlugs.csModernPractice]
        .description as string,
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
      images: [
        {
          url: projectsRecords[projectSlugs.csA11y].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Accessibility Case Study (Serials)',
        },
      ],
    },
    twitter: {
      images: [
        projectsRecords[projectSlugs.csA11y].cover.src,
        {
          url: projectsRecords[projectSlugs.csA11y].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Accessibility Case Study (Serials)',
        },
      ],
      title: 'Project | Accessibility Case Study (Serials)',
      description: projectsRecords[projectSlugs.csA11y].description as string,
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
      images: [
        {
          url: projectsRecords[projectSlugs.csLogisticsDashboard].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Logistics Dashboard Case Study',
        },
      ],
    },
    twitter: {
      images: [
        projectsRecords[projectSlugs.csLogisticsDashboard].cover.src,
        {
          url: projectsRecords[projectSlugs.csLogisticsDashboard].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Logistics Dashboard Case Study',
        },
      ],
      title: 'Project | Logistics Dashboard Case Study',
      description: projectsRecords[projectSlugs.csLogisticsDashboard]
        .description as string,
    },
  },
};
