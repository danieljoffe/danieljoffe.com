import { AllowedExperienceSlugs, ExperienceStructuredData } from '@/types/base';
import { DOMAIN_URL, FULL_NAME, EXPERIENCE_LINK } from '@/utils/constants';
import { experienceMdxMetadata } from '@/data/content/experience';
import { experienceSlugs, experiencePageSlugs } from '../experience';
import {
  personStructuredData as member,
  CollectionPageStructuredData,
} from './base';

function worksFor(slug: AllowedExperienceSlugs) {
  const meta = experienceMdxMetadata[slug];
  const base = {
    '@type': 'Corporation' as const,
    name: meta.company ?? meta.title,
  };
  // Omit url for entries without a domain (e.g. self-directed Professional
  // Development). schema.org accepts Corporation without url.
  return meta.domain ? { ...base, url: meta.domain } : base;
}

const wincExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceMdxMetadata[experienceSlugs.Winc].role ?? '',
  startDate: '2015-06',
  endDate: '2017-10',
  description:
    'Frontend Developer at Winc (formerly ClubW), building a self-serve landing page CMS and leading the technical rebrand migration.',
  worksFor: worksFor(experienceSlugs.Winc),
  member,
};

const IBExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceMdxMetadata[experienceSlugs.IB].role ?? '',
  startDate: '2018-03',
  endDate: '2019-08',
  description:
    'Frontend Developer at Internet Brands Health vertical, leading a small team, driving HIPAA-compliant frontend architecture, and building a shared React component library.',
  worksFor: worksFor(experienceSlugs.IB),
  member,
};

const TLCExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceMdxMetadata[experienceSlugs.TLC].role ?? '',
  startDate: '2019-09',
  endDate: '2021-11',
  description:
    'Software Engineer at The Library Corporation, building specialized cataloging features and remediating accessibility issues for 5,500+ libraries.',
  worksFor: worksFor(experienceSlugs.TLC),
  member,
};

const FCExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceMdxMetadata[experienceSlugs.FC].role ?? '',
  startDate: '2021-11',
  endDate: '2023-01',
  description:
    'Full-Stack Engineer at FightCamp, leading infrastructure and frontend performance improvements to support rapid user growth.',
  worksFor: worksFor(experienceSlugs.FC),
  member,
};

const PDExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceMdxMetadata[experienceSlugs.SD].role ?? '',
  startDate: '2023-01',
  description:
    'Full-Stack Engineer combining formal computer science education with contract engineering work.',
  worksFor: worksFor(experienceSlugs.SD),
  member,
};

export const experienceStructuredData: Record<
  AllowedExperienceSlugs,
  ExperienceStructuredData
> = {
  [experienceSlugs.Winc]: wincExperienceSD,
  [experienceSlugs.IB]: IBExperienceSD,
  [experienceSlugs.TLC]: TLCExperienceSD,
  [experienceSlugs.FC]: FCExperienceSD,
  [experienceSlugs.SD]: PDExperienceSD,
};

export const experienceRootStructuredData: CollectionPageStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: `Experience | ${FULL_NAME} - Full-Stack Engineer`,
  description:
    'Five companies, ten years. Every engagement left the team faster and more autonomous than I found them.',
  url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}`,
  author: member,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: experiencePageSlugs.map((slug, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: experienceMdxMetadata[slug].title,
      url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${slug}`,
      description: experienceMdxMetadata[slug].excerpt,
    })),
  },
};
