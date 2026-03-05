import { type experiencePageSlugs } from '@/data/experience';
import { type projectPageSlugs } from '@/data/project';
import { Blog, Corporation, Person, Role } from 'schema-dts';

export type WithChildren = {
  children: React.ReactNode;
};

export interface NavLink {
  label: string;
  href: `/${string}` | `https://${string}` | string;
}

export interface BreadCrumbsProps {
  items: NavLink[];
}

export interface SlugPageProps {
  params: Promise<{ slug: string }>;
}

export type ExperienceStructuredData = Role & {
  '@context': 'https://schema.org';
  worksFor: Corporation;
  member: Person;
};

export type ProjectStructuredData = Blog & {
  '@context': 'https://schema.org';
  author: Person;
};

export type AllowedExperienceSlugs = (typeof experiencePageSlugs)[number];
export type AllowedProjectSlugs = (typeof projectPageSlugs)[number];
