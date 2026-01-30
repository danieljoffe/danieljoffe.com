import { UNSPLASH_URL } from '@/utils/constants';
import { PostThumbnailI } from '@/types/post.types';
import { AllowedProjectSlugs } from '@/types/base';
import { projectSlugs } from '@/data/project';
import { PROJECTS_LINK } from '@/utils/base';

export const projectsRecords: Record<AllowedProjectSlugs, PostThumbnailI> = {
  [projectSlugs.csPerformance]: {
    slug: projectSlugs.csPerformance,
    title: 'Case Studies: Daniel Joffe Portfolio',
    description:
      'How I cut mobile load times from 10s to 2s and reduced bounce rates by 39% at FightCamp.',
    backgroundColor: 'bg-stone-950',
    link: {
      label: 'Performance Optimization Case Study',
      href: `${PROJECTS_LINK.href}/${projectSlugs.csPerformance}`,
    },
    cover: {
      alt: 'A winding road through a lush green forest',
      src: '/photo-1506744038136-46273834b3fb',
      origin: `${UNSPLASH_URL}/photos/a-winding-road-through-a-lush-green-forest-JyVcAIUAcPM`,
      creator: '@mischievous_penguins',
      blurHash: 'LQI+:]jY_3j[~qkCj[j[00kCw^j[',
    },
  },
  [projectSlugs.csCLibrary]: {
    slug: projectSlugs.csCLibrary,
    title: 'Case Study 2: Internet Brands — React Component Library',
    description:
      'Building a React component library adopted by 80% of applications—and training the team to own it.',
    backgroundColor: 'bg-fuchsia-950',
    link: {
      label: 'Component Library Case Study',
      href: `${PROJECTS_LINK.href}/${projectSlugs.csCLibrary}`,
    },
    cover: {
      alt: 'A purple LED grid forming a pattern',
      src: '/photo-1464983953574-0892a716854b',
      origin: `${UNSPLASH_URL}/photos/a-purple-led-grid-forming-a-pattern-hGV2TfOh0ns`,
      creator: '@dan_carlson',
      blurHash: 'L86k*:xXWCM{-;WBaxf6bcWAWBf6',
    },
  },
  [projectSlugs.csCMSTooling]: {
    slug: projectSlugs.csCMSTooling,
    title: 'Case Study 3: Winc — Self-Serve Landing Page CMS',
    description:
      'From 3 pages per week to 200+ in two months: building self-serve tooling that eliminated engineering bottlenecks.',
    backgroundColor: 'bg-amber-950',
    link: {
      label: 'CMS Tooling Case Study',
      href: `${PROJECTS_LINK.href}/${projectSlugs.csCMSTooling}`,
    },
    cover: {
      alt: 'An open book on a lit desk',
      src: '/photo-1515378791036-0648a3ef77b2',
      origin: `${UNSPLASH_URL}/photos/an-open-book-on-a-lit-desk-wrHIcAR0AWc`,
      creator: '@green_chameleon',
      blurHash: 'LMFXnIo}M{oJ~qayRkWWIpnhSgWB',
    },
  },

  [projectSlugs.csModernPractice]: {
    slug: projectSlugs.csModernPractice,
    title: 'Case Study: Modern Practice — Web Engineering Best Practices',
    description:
      'Building this portfolio: NX monorepo, GSAP animations, full test coverage, and what I learned along the way.',
    backgroundColor: 'bg-cyan-950',
    link: {
      label: 'Modern Practice Case Study',
      href: `${PROJECTS_LINK.href}/${projectSlugs.csModernPractice}`,
    },
    cover: {
      alt: 'A developer desk with modern gadgets and screens showing code',
      src: '/photo-1519389950473-47ba0277781c',
      origin: `${UNSPLASH_URL}/photos/a-modern-desk-with-monitors-UQ9U_uwRX9A`,
      creator: '@matthewhenry',
      blurHash: 'L35#2u9FRiRi}pNHxZay4UayIUae',
    },
  },
  [projectSlugs.csA11y]: {
    slug: projectSlugs.csA11y,
    title: 'Case Study: Accessibility Serials — Real-World A11y Solutions',
    description:
      'Fixing 200+ WCAG violations across legacy systems—and building accessibility into everything since.',
    backgroundColor: 'bg-green-950',
    link: {
      label: 'Accessibility Case Study (Serials)',
      href: `${PROJECTS_LINK.href}/${projectSlugs.csA11y}`,
    },
    cover: {
      alt: 'Closeup of hands reading braille on a tactile page',
      src: '/photo-1465101162946-4377e57745c3',
      origin: `${UNSPLASH_URL}/photos/closeup-of-braille-page-OzAeZPNsLXk`,
      creator: '@sigmund',
      blurHash: 'LHCcFN_4ADxu};tR%MRk-pM{s:af',
    },
  },
  [projectSlugs.csLogisticsDashboard]: {
    slug: projectSlugs.csLogisticsDashboard,
    title: 'Case Study: Logistics Dashboard MVP — Next.js & AWS Cognito',
    description:
      'Shipping a logistics dashboard MVP with Next.js and AWS Cognito for a seed-stage venture.',
    backgroundColor: 'bg-blue-950',
    link: {
      label: 'Logistics Dashboard Case Study',
      href: `${PROJECTS_LINK.href}/${projectSlugs.csLogisticsDashboard}`,
    },
    cover: {
      alt: 'A screenshot of a dashboard interface with charts and data visualization',
      src: '/photo-1504384308090-c894fdcc538d',
      origin: `${UNSPLASH_URL}/photos/dashboard-charts-pypeCEaJeZY`,
      creator: '@lukechesser',
      blurHash: 'L75vOp_4D%xu~qogt8afRjWBt7j[',
    },
  },
  [projectSlugs.uiV1]: {
    slug: projectSlugs.uiV1,
    title: 'Building a Design System: UI Components for danieljoffe.com',
    description:
      "This portfolio's design system: 20+ documented components built with accessibility and reusability in mind.",
    backgroundColor: 'bg-slate-900',
    link: {
      label: 'UI Components V1',
      href: `${PROJECTS_LINK.href}/${projectSlugs.uiV1}`,
    },
    cover: {
      alt: 'An image of a jellyfish in the dark',
      src: `/photo-1636576109679-6f23fdc040c8`,
      origin: `${UNSPLASH_URL}/photos/an-image-of-a-jellyfish-in-the-dark-4ckVcNeshmQ`,
      creator: '@and_machines',
      blurHash: 'L125+JD~D#-rn$WCkCj?D~xbxbNc',
    },
  },
  [projectSlugs.uiV2]: {
    slug: projectSlugs.uiV2,
    title: 'Expanding the Design System: UI Components Part 2',
    description:
      "This portfolio's design system: form controls, feedback, and layout primitives completing the component library.",
    backgroundColor: 'bg-violet-950',
    link: {
      label: 'UI Components V2',
      href: `${PROJECTS_LINK.href}/${projectSlugs.uiV2}`,
    },
    cover: {
      alt: 'Abstract purple geometric shapes',
      src: `/photo-1636576109679-6f23fdc040c8`,
      origin: `${UNSPLASH_URL}/photos/an-image-of-a-jellyfish-in-the-dark-4ckVcNeshmQ`,
      creator: '@and_machines',
      blurHash: 'L125+JD~D#-rn$WCkCj?D~xbxbNc',
    },
  },
};
