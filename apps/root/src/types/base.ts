import { Article, Blog, Corporation, Person, Role } from 'schema-dts';
import { type experiencePageSlugs } from '@/data/experience';
import { type projectPageSlugs } from '@/data/project';
import { type blogPageSlugs } from '@/data/blog';

export type WithChildren = {
  children: React.ReactNode;
};

export interface NavLink {
  label: string;
  href: `/${string}` | `https://${string}` | string;
  /** External destination — open in a new tab with an external-link affordance. */
  external?: boolean;
}

export interface BreadCrumbsProps {
  items: NavLink[];
  /**
   * Detail pages only: when set, clicking a parent crumb morphs the detail
   * hero into the matching list card via a View Transition. The value is the
   * shared `view-transition-name`.
   */
  coverTransitionName?: string | undefined;
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
export type AllowedBlogSlugs = (typeof blogPageSlugs)[number];

export type BlogStructuredData = Article & {
  '@context': 'https://schema.org';
  author: Person;
};
