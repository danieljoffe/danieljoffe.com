import { type experiencePageSlugs } from '@/data/experience';
import { type projectPageSlugs } from '@/data/project';
import { Blog, Corporation, Person, Role } from 'schema-dts';

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

export type ProjectStructuredDataI = Blog & {
  '@context': 'https://schema.org';
  author: Person;
};

export type AllowedExperienceSlugs = (typeof experiencePageSlugs)[number];
export type AllowedProjectSlugs = (typeof projectPageSlugs)[number];
