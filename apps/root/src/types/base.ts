import { type experiencePageSlugs } from '@/data/base';
import { Corporation, Person, Role } from 'schema-dts';

export type WChildrenT = {
  children: React.ReactNode;
};

export interface NavLink {
  label: string;
  href: `/${string}` | `https://${string}` | string;
}

export interface BreadCrumbsI {
  items: NavLink[];
}

export interface SlugPagePropsI {
  params: Promise<{ slug: string }>;
}

export type ExperienceStructuredDataI = Role & {
  '@context': 'https://schema.org';
  worksFor: Corporation;
  member: Person;
};

export type AllowedExperienceSlugs = (typeof experiencePageSlugs)[number];
