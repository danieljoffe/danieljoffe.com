import { AllowedExperienceSlugs } from '@/types/base';
import { Metadata } from 'next';
import { DOMAIN_URL, FULL_NAME } from '@/utils/constants';
import { EXPERIENCE_LINK } from '@/components/Nav/Links';
import { experienceRecords } from '../experienceThumbnails';
import {
  experienceRoles,
  experienceNames,
  experienceSlugs,
} from '../experience';

export const experienceRootMetadata: Metadata = {
  title: `Experience | ${FULL_NAME} - Frontend Engineer`,
  description:
    'An overview of my professional journey as a frontend engineer—covering key roles, impactful projects, and the technical expertise I bring to building performant, user-focused web applications.',
  keywords: [
    FULL_NAME,
    'Portfolio',
    'Experience',
    'Work History',
    'Professional Experience',
    'Frontend Engineer',
    'Software Engineer',
    'Full-Stack Engineer',
    'Career Journey',
    'Work Experience',
    'Professional Background',
    'Web Development',
    'Software Development',
  ],
  alternates: {
    canonical: EXPERIENCE_LINK.href,
  },
  openGraph: {
    title: `${FULL_NAME} - Professional Experience & Work History`,
    description:
      'An overview of my professional journey as a frontend engineer—covering key roles, impactful projects, and the technical expertise I bring to building performant, user-focused web applications.',
    url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}`,
    type: 'website',
    siteName: FULL_NAME,
  },
  twitter: {
    title: `${FULL_NAME} - Professional Experience & Work History`,
    description:
      'An overview of my professional journey as a frontend engineer—covering key roles, impactful projects, and technical expertise.',
    card: 'summary_large_image',
  },
};

export const experiencePagesMetadata: Record<AllowedExperienceSlugs, Metadata> =
  {
    [experienceSlugs.Winc]: {
      title: `Experience | ${experienceRoles.Winc} at ${experienceNames.Winc}`,
      description: experienceRecords[experienceSlugs.Winc].description,
      keywords: [
        FULL_NAME,
        experienceNames.Winc,
        experienceRoles.Winc,
        'Experience',
        'Work History',
        'Professional Experience',
        'Frontend Developer',
        'Software Engineer',
        'Angular',
        'CMS',
        'Marketing Operations',
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
        canonical: `${EXPERIENCE_LINK.href}/${experienceSlugs.Winc}`,
      },
      openGraph: {
        title: `${experienceRoles.Winc} at ${experienceNames.Winc} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.Winc].description,
        url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${experienceSlugs.Winc}`,
        type: 'article',
        siteName: FULL_NAME,
        images: [
          {
            url: experienceRecords[experienceSlugs.Winc].cover.src,
            width: 800,
            height: 450,
            alt: experienceRecords[experienceSlugs.Winc].cover.alt,
          },
        ],
      },
      twitter: {
        title: `${experienceRoles.Winc} at ${experienceNames.Winc} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.Winc].description,
        card: 'summary_large_image',
        images: [experienceRecords[experienceSlugs.Winc].cover.src],
      },
    },
    [experienceSlugs.IB]: {
      title: `Experience | ${experienceRoles.IB} at ${experienceNames.IB}`,
      description: experienceRecords[experienceSlugs.IB].description,
      keywords: [
        FULL_NAME,
        experienceNames.IB,
        experienceRoles.IB,
        'Experience',
        'Work History',
        'Professional Experience',
        'Frontend Developer',
        'Software Engineer',
        'React',
        'HIPAA',
        'Healthcare',
        'Team Leadership',
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
        canonical: `${EXPERIENCE_LINK.href}/${experienceSlugs.IB}`,
      },
      openGraph: {
        title: `${experienceRoles.IB} at ${experienceNames.IB} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.IB].description,
        url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${experienceSlugs.IB}`,
        type: 'article',
        siteName: FULL_NAME,
        images: [
          {
            url: experienceRecords[experienceSlugs.IB].cover.src,
            width: 800,
            height: 450,
            alt: experienceRecords[experienceSlugs.IB].cover.alt,
          },
        ],
      },
      twitter: {
        title: `${experienceRoles.IB} at ${experienceNames.IB} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.IB].description,
        card: 'summary_large_image',
        images: [experienceRecords[experienceSlugs.IB].cover.src],
      },
    },
    [experienceSlugs.TLC]: {
      title: `Experience | ${experienceRoles.TLC} at ${experienceNames.TLC}`,
      description: experienceRecords[experienceSlugs.TLC].description,
      keywords: [
        FULL_NAME,
        experienceNames.TLC,
        experienceRoles.TLC,
        'Experience',
        'Work History',
        'Professional Experience',
        'Software Engineer',
        'Accessibility',
        'WCAG',
        'Library Software',
        'Angular',
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
        canonical: `${EXPERIENCE_LINK.href}/${experienceSlugs.TLC}`,
      },
      openGraph: {
        title: `${experienceRoles.TLC} at ${experienceNames.TLC} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.TLC].description,
        url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${experienceSlugs.TLC}`,
        type: 'article',
        siteName: FULL_NAME,
        images: [
          {
            url: experienceRecords[experienceSlugs.TLC].cover.src,
            width: 800,
            height: 450,
            alt: experienceRecords[experienceSlugs.TLC].cover.alt,
          },
        ],
      },
      twitter: {
        title: `${experienceRoles.TLC} at ${experienceNames.TLC} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.TLC].description,
        card: 'summary_large_image',
        images: [experienceRecords[experienceSlugs.TLC].cover.src],
      },
    },
    [experienceSlugs.FC]: {
      title: `Experience | ${experienceRoles.FC} at ${experienceNames.FC}`,
      description: experienceRecords[experienceSlugs.FC].description,
      keywords: [
        FULL_NAME,
        experienceNames.FC,
        experienceRoles.FC,
        'Experience',
        'Work History',
        'Professional Experience',
        'Full Stack Engineer',
        'Performance Optimization',
        'Vue.js',
        'Nuxt.js',
        'Infrastructure',
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
        canonical: `${EXPERIENCE_LINK.href}/${experienceSlugs.FC}`,
      },
      openGraph: {
        title: `${experienceRoles.FC} at ${experienceNames.FC} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.FC].description,
        url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${experienceSlugs.FC}`,
        type: 'article',
        siteName: FULL_NAME,
        images: [
          {
            url: experienceRecords[experienceSlugs.FC].cover.src,
            width: 800,
            height: 450,
            alt: experienceRecords[experienceSlugs.FC].cover.alt,
          },
        ],
      },
      twitter: {
        title: `${experienceRoles.FC} at ${experienceNames.FC} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.FC].description,
        card: 'summary_large_image',
        images: [experienceRecords[experienceSlugs.FC].cover.src],
      },
    },
    [experienceSlugs.SD]: {
      title: `Experience | ${experienceRoles.SD} - ${experienceNames.SD}`,
      description: experienceRecords[experienceSlugs.SD].description,
      keywords: [
        FULL_NAME,
        experienceNames.SD,
        experienceRoles.SD,
        'Experience',
        'Work History',
        'Professional Experience',
        'Senior Frontend Developer',
        'Contract Work',
        'Computer Science',
        'Next.js',
        'Professional Development',
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
        canonical: `${EXPERIENCE_LINK.href}/${experienceSlugs.SD}`,
      },
      openGraph: {
        title: `${experienceRoles.SD} - ${experienceNames.SD} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.SD].description,
        url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${experienceSlugs.SD}`,
        type: 'article',
        siteName: FULL_NAME,
        images: [
          {
            url: experienceRecords[experienceSlugs.SD].cover.src,
            width: 800,
            height: 450,
            alt: experienceRecords[experienceSlugs.SD].cover.alt,
          },
        ],
      },
      twitter: {
        title: `${experienceRoles.SD} - ${experienceNames.SD} - ${FULL_NAME}`,
        description: experienceRecords[experienceSlugs.SD].description,
        card: 'summary_large_image',
        images: [experienceRecords[experienceSlugs.SD].cover.src],
      },
    },
  };
