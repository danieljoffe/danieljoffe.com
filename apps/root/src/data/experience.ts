import { AllowedExperienceSlugs } from '@/types/base';
import { DOMAIN_URL } from '@/utils/constants';

export const experienceRoles = {
  Winc: 'Frontend Developer',
  IB: 'Frontend Developer',
  TLC: 'Software Engineer',
  FC: 'Full Stack Engineer',
  SD: 'Full-Stack Engineer',
} as const;

export const experienceNames = {
  Winc: 'Winc',
  IB: 'Internet Brands',
  TLC: 'The Library Corporation',
  FC: 'FightCamp',
  SD: 'Professional Development & Contract Work',
} as const;

export const experienceDomains = {
  Winc: 'https://www.winc.com',
  IB: 'https://www.internetbrands.com',
  TLC: 'https://tlcdelivers.com',
  FC: 'https://joinfightcamp.com',
  SD: DOMAIN_URL,
} as const;

export const experienceSlugs = {
  Winc: 'winc',
  IB: 'internet-brands',
  TLC: 'the-library-corporation',
  FC: 'fightcamp',
  SD: 'professional-development',
} as const;

export const experienceLogos = {
  Winc: '/images/winc-logo.svg',
  IB: '/images/internet-brands-logo.svg',
  TLC: '/images/the-library-corporation-logo.svg',
  FC: '/images/fightcamp-logo.svg',
  SD: '/images/logo.svg',
};

export const experiencePageSlugs = [...Object.values(experienceSlugs)];

export const experienceFull: Record<
  AllowedExperienceSlugs,
  {
    slug: string;
    company: string;
    logo: string;
    role: string;
    invert: boolean;
  }
> = {
  [experienceSlugs.Winc]: {
    slug: experienceSlugs.Winc,
    company: experienceNames.Winc,
    logo: experienceLogos.Winc,
    role: experienceRoles.Winc,
    invert: true,
  },
  [experienceSlugs.IB]: {
    slug: experienceSlugs.IB,
    company: experienceNames.IB,
    logo: experienceLogos.IB,
    role: experienceRoles.IB,
    invert: true,
  },
  [experienceSlugs.TLC]: {
    slug: experienceSlugs.TLC,
    company: experienceNames.TLC,
    logo: experienceLogos.TLC,
    role: experienceRoles.TLC,
    invert: false,
  },
  [experienceSlugs.FC]: {
    slug: experienceSlugs.FC,
    company: experienceNames.FC,
    logo: experienceLogos.FC,
    role: experienceRoles.FC,
    invert: true,
  },
  [experienceSlugs.SD]: {
    slug: experienceSlugs.SD,
    company: experienceNames.SD,
    logo: experienceLogos.SD,
    role: experienceRoles.SD,
    invert: false,
  },
};
