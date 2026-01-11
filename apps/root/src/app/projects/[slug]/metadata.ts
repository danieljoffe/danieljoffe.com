import { DOMAIN_URL, FULL_NAME } from '@/utils/constants';
import {
  uiComponentsV1Slug,
  caseStudyPerformance,
  caseStudyComponentLibrary,
  caseStudyCMSTooling,
  caseStudyAccessibilitySerials,
  caseStudyModernPractice,
  caseStudyLogisticsDashboard,
  AllowedPages,
} from '../projects-list';
import { PROJECTS_LINK } from '@/components/assembled/Nav/Links';
import { Metadata } from 'next';
import { pagesRecords } from '../constants';

export const projectMetadata: Record<AllowedPages, Metadata> = {
  [uiComponentsV1Slug]: {
    title: 'Project | UI Components V1',
    description: pagesRecords[uiComponentsV1Slug].description,
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
      canonical: `${PROJECTS_LINK.href}/${uiComponentsV1Slug}`,
    },
    openGraph: {
      images: [
        {
          url: pagesRecords[uiComponentsV1Slug].cover.src,
          width: 4042,
          height: 2695,
          alt: 'UI Components V1',
        },
      ],
    },
    twitter: {
      images: [
        pagesRecords[uiComponentsV1Slug].cover.src,
        {
          url: pagesRecords[uiComponentsV1Slug].cover.src,
          width: 4042,
          height: 2695,
          alt: 'UI Components V1',
        },
      ],
      title: 'Project | UI Components V1',
      description: pagesRecords[uiComponentsV1Slug].description as string,
    },
  },
  [caseStudyPerformance]: {
    title: 'Project | Performance Optimization Case Study',
    description: pagesRecords[caseStudyPerformance].description,
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
      canonical: `${PROJECTS_LINK.href}/${caseStudyPerformance}`,
    },
    openGraph: {
      images: [
        {
          url: pagesRecords[caseStudyPerformance].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Performance Optimization Case Study',
        },
      ],
    },
    twitter: {
      images: [
        pagesRecords[caseStudyPerformance].cover.src,
        {
          url: pagesRecords[caseStudyPerformance].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Performance Optimization Case Study',
        },
      ],
      title: 'Project | Performance Optimization Case Study',
      description: pagesRecords[caseStudyPerformance].description as string,
    },
  },
  [caseStudyComponentLibrary]: {
    title: 'Project | Component Library Case Study',
    description: pagesRecords[caseStudyComponentLibrary].description,
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
      canonical: `${PROJECTS_LINK.href}/${caseStudyComponentLibrary}`,
    },
    openGraph: {
      images: [
        {
          url: pagesRecords[caseStudyComponentLibrary].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Component Library Case Study',
        },
      ],
    },
    twitter: {
      images: [
        pagesRecords[caseStudyComponentLibrary].cover.src,
        {
          url: pagesRecords[caseStudyComponentLibrary].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Component Library Case Study',
        },
      ],
      title: 'Project | Component Library Case Study',
      description: pagesRecords[caseStudyComponentLibrary]
        .description as string,
    },
  },
  [caseStudyCMSTooling]: {
    title: 'Project | CMS Tooling Case Study',
    description: pagesRecords[caseStudyCMSTooling].description,
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
      canonical: `${PROJECTS_LINK.href}/${caseStudyCMSTooling}`,
    },
    openGraph: {
      images: [
        {
          url: pagesRecords[caseStudyCMSTooling].cover.src,
          width: 4042,
          height: 2695,
          alt: 'CMS Tooling Case Study',
        },
      ],
    },
    twitter: {
      images: [
        pagesRecords[caseStudyCMSTooling].cover.src,
        {
          url: pagesRecords[caseStudyCMSTooling].cover.src,
          width: 4042,
          height: 2695,
          alt: 'CMS Tooling Case Study',
        },
      ],
      title: 'Project | CMS Tooling Case Study',
      description: pagesRecords[caseStudyCMSTooling].description as string,
    },
  },
  [caseStudyModernPractice]: {
    title: 'Project | Modern Practice Case Study',
    description: pagesRecords[caseStudyModernPractice].description,
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
      canonical: `${PROJECTS_LINK.href}/${caseStudyModernPractice}`,
    },
    openGraph: {
      images: [
        {
          url: pagesRecords[caseStudyModernPractice].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Modern Practice Case Study',
        },
      ],
    },
    twitter: {
      images: [
        pagesRecords[caseStudyModernPractice].cover.src,
        {
          url: pagesRecords[caseStudyModernPractice].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Modern Practice Case Study',
        },
      ],
      title: 'Project | Modern Practice Case Study',
      description: pagesRecords[caseStudyModernPractice].description as string,
    },
  },
  [caseStudyAccessibilitySerials]: {
    title: 'Project | Accessibility Case Study (Serials)',
    description: pagesRecords[caseStudyAccessibilitySerials].description,
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
      canonical: `${PROJECTS_LINK.href}/${caseStudyAccessibilitySerials}`,
    },
    openGraph: {
      images: [
        {
          url: pagesRecords[caseStudyAccessibilitySerials].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Accessibility Case Study (Serials)',
        },
      ],
    },
    twitter: {
      images: [
        pagesRecords[caseStudyAccessibilitySerials].cover.src,
        {
          url: pagesRecords[caseStudyAccessibilitySerials].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Accessibility Case Study (Serials)',
        },
      ],
      title: 'Project | Accessibility Case Study (Serials)',
      description: pagesRecords[caseStudyAccessibilitySerials]
        .description as string,
    },
  },
  [caseStudyLogisticsDashboard]: {
    title: 'Project | Logistics Dashboard Case Study',
    description: pagesRecords[caseStudyLogisticsDashboard].description,
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
      canonical: `${PROJECTS_LINK.href}/${caseStudyLogisticsDashboard}`,
    },
    openGraph: {
      images: [
        {
          url: pagesRecords[caseStudyLogisticsDashboard].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Logistics Dashboard Case Study',
        },
      ],
    },
    twitter: {
      images: [
        pagesRecords[caseStudyLogisticsDashboard].cover.src,
        {
          url: pagesRecords[caseStudyLogisticsDashboard].cover.src,
          width: 4042,
          height: 2695,
          alt: 'Logistics Dashboard Case Study',
        },
      ],
      title: 'Project | Logistics Dashboard Case Study',
      description: pagesRecords[caseStudyLogisticsDashboard]
        .description as string,
    },
  },
};
