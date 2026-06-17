import type { BuiltProject } from '@/components/kit';
import {
  NPM_SHARED_UI_URL,
  STORYBOOK_URL,
  WYRDFOLD_URL,
} from '@/utils/constants';

/**
 * Live products and packages I've shipped, surfaced on the projects page
 * alongside the case studies. External links — each opens in a new tab.
 */
export const builtProjects: BuiltProject[] = [
  {
    title: 'WyrdFold',
    label: 'Product',
    href: WYRDFOLD_URL,
    description:
      'A job-search product that turns your profile into the scoring model: ranked matches become ATS-safe, traceable resume drafts. Next.js + FastAPI + Supabase with production LLM pipelines.',
    cover: {
      src: '/images/projects/built-wyrdfold.webp',
      alt: 'WyrdFold landing page with the headline "The search runs while you don\'t."',
    },
  },
  {
    title: '@danieljoffe/shared-ui',
    label: 'npm package',
    href: NPM_SHARED_UI_URL,
    description:
      'A published React component library: 40+ accessible, theme-aware UI primitives built with Tailwind CSS 4, released via Changesets and OIDC trusted publishing.',
    cover: {
      src: '/images/projects/built-shared-ui-npm.webp',
      alt: 'The npm registry page for the @danieljoffe/shared-ui package',
    },
  },
  {
    title: 'Shared UI · Storybook',
    label: 'Storybook',
    href: STORYBOOK_URL,
    description:
      'The live component catalog for shared-ui: dark-first, accessibility-first, with interactive controls and visual-regression coverage.',
    cover: {
      src: '/images/projects/built-shared-ui-storybook.webp',
      alt: 'The Storybook component catalog for the shared-ui library',
    },
  },
];
