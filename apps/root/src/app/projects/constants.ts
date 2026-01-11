import { PROJECTS_LINK } from '@/components/assembled/Nav/Links';
import {
  AllowedPages,
  caseStudyAccessibilitySerials,
  caseStudyCMSTooling,
  caseStudyComponentLibrary,
  caseStudyLogisticsDashboard,
  caseStudyModernPractice,
  caseStudyPerformance,
  ProjectInfo,
  uiComponentsV1Slug,
} from './projects-list';
import { UNSPLASH_URL } from '@/utils/constants';

export const pagesRecords: Record<AllowedPages, ProjectInfo> = {
  [caseStudyPerformance]: {
    slug: caseStudyPerformance,
    description:
      'Case study on performance optimization and critical web vitals improvements for a high-traffic React site. Covers auditing, lazy loading, bundle splitting, and measurable results.',
    backgroundColor: 'bg-stone-950',
    link: {
      label: 'Performance Optimization Case Study',
      href: `${PROJECTS_LINK.href}/${caseStudyPerformance}`,
    },
    cover: {
      alt: 'A winding road through a lush green forest',
      src: '/photo-1506744038136-46273834b3fb',
      origin: `${UNSPLASH_URL}/photos/a-winding-road-through-a-lush-green-forest-JyVcAIUAcPM`,
      creator: '@mischievous_penguins',
      blurHash: 'LQI+:]jY_3j[~qkCj[j[00kCw^j[',
    },
  },
  [caseStudyComponentLibrary]: {
    slug: caseStudyComponentLibrary,
    description:
      'Story of building and evangelizing a component library to accelerate development and improve maintainability and team capability. Training, documentation, and measurable team outcomes.',
    backgroundColor: 'bg-fuchsia-950',
    link: {
      label: 'Component Library Case Study',
      href: `${PROJECTS_LINK.href}/${caseStudyComponentLibrary}`,
    },
    cover: {
      alt: 'A purple LED grid forming a pattern',
      src: '/photo-1464983953574-0892a716854b',
      origin: `${UNSPLASH_URL}/photos/a-purple-led-grid-forming-a-pattern-hGV2TfOh0ns`,
      creator: '@dan_carlson',
      blurHash: 'L86k*:xXWCM{-;WBaxf6bcWAWBf6',
    },
  },
  [caseStudyCMSTooling]: {
    slug: caseStudyCMSTooling,
    description:
      'How a custom CMS enabled marketers to ship 200+ landing pages with zero engineering support, freeing up developer time and improving conversion rates. Problem, approach, impact.',
    backgroundColor: 'bg-amber-950',
    link: {
      label: 'CMS Tooling Case Study',
      href: `${PROJECTS_LINK.href}/${caseStudyCMSTooling}`,
    },
    cover: {
      alt: 'An open book on a lit desk',
      src: '/photo-1515378791036-0648a3ef77b2',
      origin: `${UNSPLASH_URL}/photos/an-open-book-on-a-lit-desk-wrHIcAR0AWc`,
      creator: '@green_chameleon',
      blurHash: 'LMFXnIo}M{oJ~qayRkWWIpnhSgWB',
    },
  },

  [caseStudyModernPractice]: {
    slug: caseStudyModernPractice,
    description:
      'Case study exploring adoption of modern best practices in web engineering. Focus on developer experience, code quality, and tangible impact of new tools and methodologies.',
    backgroundColor: 'bg-cyan-950',
    link: {
      label: 'Modern Practice Case Study',
      href: `${PROJECTS_LINK.href}/${caseStudyModernPractice}`,
    },
    cover: {
      alt: 'A developer desk with modern gadgets and screens showing code',
      src: '/photo-1519389950473-47ba0277781c',
      origin: `${UNSPLASH_URL}/photos/a-modern-desk-with-monitors-UQ9U_uwRX9A`,
      creator: '@matthewhenry',
      blurHash: 'L35#2u9FRiRi}pNHxZay4UayIUae',
    },
  },
  [caseStudyAccessibilitySerials]: {
    slug: caseStudyAccessibilitySerials,
    description:
      'A serial deep dive into real-world accessibility (a11y) challenges and solutions across several projects. Covers audits, remediations, and inclusive technical strategy.',
    backgroundColor: 'bg-green-950',
    link: {
      label: 'Accessibility Case Study (Serials)',
      href: `${PROJECTS_LINK.href}/${caseStudyAccessibilitySerials}`,
    },
    cover: {
      alt: 'Closeup of hands reading braille on a tactile page',
      src: '/photo-1465101162946-4377e57745c3',
      origin: `${UNSPLASH_URL}/photos/closeup-of-braille-page-OzAeZPNsLXk`,
      creator: '@sigmund',
      blurHash: 'LHCcFN_4ADxu};tR%MRk-pM{s:af',
    },
  },
  [caseStudyLogisticsDashboard]: {
    slug: caseStudyLogisticsDashboard,
    description:
      'Building a logistics dashboard MVP using Next.js and AWS Cognito for a seed startup. Covers authentication, RBAC, charts, measurable delivery, and product outcomes.',
    backgroundColor: 'bg-blue-950',
    link: {
      label: 'Logistics Dashboard Case Study',
      href: `${PROJECTS_LINK.href}/${caseStudyLogisticsDashboard}`,
    },
    cover: {
      alt: 'A screenshot of a dashboard interface with charts and data visualization',
      src: '/photo-1504384308090-c894fdcc538d',
      origin: `${UNSPLASH_URL}/photos/dashboard-charts-pypeCEaJeZY`,
      creator: '@lukechesser',
      blurHash: 'L75vOp_4D%xu~qogt8afRjWBt7j[',
    },
  },
  [uiComponentsV1Slug]: {
    slug: uiComponentsV1Slug,
    description:
      'Overview and documentation of foundational UI components in the src/components/units folder. Includes usage, design principles, accessibility, and best practices.',
    backgroundColor: 'bg-slate-900',
    link: {
      label: 'UI Components V1',
      href: `${PROJECTS_LINK.href}/${uiComponentsV1Slug}`,
    },
    cover: {
      alt: 'An image of a jellyfish in the dark',
      src: `/photo-1636576109679-6f23fdc040c8`,
      origin: `${UNSPLASH_URL}/photos/an-image-of-a-jellyfish-in-the-dark-4ckVcNeshmQ`,
      creator: '@and_machines',
      blurHash: 'L125+JD~D#-rn$WCkCj?D~xbxbNc',
    },
  },
};
