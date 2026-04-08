import { AllowedExperienceSlugs, ExperienceStructuredData } from '@/types/base';
import { DOMAIN_URL, FULL_NAME, EXPERIENCE_LINK } from '@/utils/constants';
import {
  experienceNames,
  experienceRoles,
  experienceSlugs,
  experienceDomains,
  experiencePageSlugs,
} from '../experience';
import { experienceRecords } from '../experienceThumbnails';
import {
  personStructuredData as member,
  CollectionPageStructuredData,
} from './base';

const wincExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceRoles.Winc,
  startDate: '2015-06',
  endDate: '2017-10',
  description:
    'Frontend Developer at Winc (formerly ClubW), building a self-serve landing page CMS and leading the technical rebrand migration.',
  worksFor: {
    '@type': 'Corporation',
    name: experienceNames.Winc,
    url: experienceDomains.Winc,
  },
  member,
};

const IBExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceRoles.IB,
  startDate: '2018-03',
  endDate: '2019-08',
  description:
    'Frontend Developer at Internet Brands Health vertical, leading a small team, driving HIPAA-compliant frontend architecture, and building a shared React component library.',
  worksFor: {
    '@type': 'Corporation',
    name: experienceNames.IB,
    url: experienceDomains.IB,
  },
  member,
};

const TLCExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceRoles.TLC,
  startDate: '2019-09',
  endDate: '2021-11',
  description:
    'Software Engineer at The Library Corporation, building specialized cataloging features and remediating accessibility issues for 5,500+ libraries.',
  worksFor: {
    '@type': 'Corporation',
    name: experienceNames.TLC,
    url: experienceDomains.TLC,
  },
  member,
};

const FCExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceRoles.FC,
  startDate: '2021-11',
  endDate: '2023-01',
  description:
    'Full-Stack Engineer at FightCamp, leading infrastructure and frontend performance improvements to support rapid user growth.',
  worksFor: {
    '@type': 'Corporation',
    name: experienceNames.FC,
    url: experienceDomains.FC,
  },
  member,
};

const PDExperienceSD: ExperienceStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceRoles.SD,
  startDate: '2023-01',
  description:
    'Full-Stack Engineer combining formal computer science education with contract engineering work.',
  worksFor: {
    '@type': 'Corporation',
    name: experienceNames.SD,
    url: experienceDomains.SD,
  },
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
    'An overview of my professional journey as a full-stack engineer—covering key roles, impactful projects, and the technical expertise I bring to building performant, user-focused web applications.',
  url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}`,
  author: member,
  mainEntity: {
    '@type': 'ItemList',
    itemListElement: experiencePageSlugs.map((slug, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: experienceRecords[slug].title,
      url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}/${slug}`,
      description: experienceRecords[slug].description as string,
    })),
  },
};
