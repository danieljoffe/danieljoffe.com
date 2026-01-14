import {
  AllowedExperienceSlugs,
  ExperienceStructuredDataI,
} from '@/types/base';
import { personStructuredData as member } from './base';
import {
  experienceNames,
  experienceRoles,
  experienceSlugs,
  experienceDomains,
} from '../experience';

export const wincExperienceSD: ExperienceStructuredDataI = {
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

export const IBExperienceSD: ExperienceStructuredDataI = {
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

export const TLCExperienceSD: ExperienceStructuredDataI = {
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

export const FCExperienceSD: ExperienceStructuredDataI = {
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

export const PDExperienceSD: ExperienceStructuredDataI = {
  '@context': 'https://schema.org',
  '@type': 'Role',
  roleName: experienceRoles.SD,
  startDate: '2023-01',
  description:
    'Senior Frontend Developer combining formal computer science education with contract engineering work.',
  worksFor: {
    '@type': 'Corporation',
    name: experienceNames.SD,
    url: experienceDomains.SD,
  },
  member,
};

export const experienceStructuredData: Record<
  AllowedExperienceSlugs,
  ExperienceStructuredDataI
> = {
  [experienceSlugs.Winc]: wincExperienceSD,
  [experienceSlugs.IB]: IBExperienceSD,
  [experienceSlugs.TLC]: TLCExperienceSD,
  [experienceSlugs.FC]: FCExperienceSD,
  [experienceSlugs.SD]: PDExperienceSD,
};
