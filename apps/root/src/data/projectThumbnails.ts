import { UNSPLASH_URL, PROJECTS_LINK } from '@/utils/constants';
import { PostThumbnail } from '@/types/postTypes';
import { AllowedProjectSlugs } from '@/types/base';
import { projectSlugs } from '@/data/project';

export const projectsRecords: Record<AllowedProjectSlugs, PostThumbnail> = {
  [projectSlugs.csPerformance]: {
    slug: projectSlugs.csPerformance,
    title: 'Case Studies: Daniel Joffe Portfolio',
    description:
      'How I cut mobile load times from 10s to 2s and reduced bounce rates by 39% at FightCamp.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csPerformance}`,
    },
    featured: true,
    cover: {
      alt: 'A winding road through a lush green forest',
      src: '/photo-1506744038136-46273834b3fb',
      origin: `${UNSPLASH_URL}/photos/a-winding-road-through-a-lush-green-forest-JyVcAIUAcPM`,
      creator: '@mischievous_penguins',
    },
  },
  [projectSlugs.csCLibrary]: {
    slug: projectSlugs.csCLibrary,
    title: 'Case Study 2: Internet Brands — React Component Library',
    description:
      'Building a React component library adopted by 80% of applications—and training the team to own it.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csCLibrary}`,
    },
    featured: true,
    cover: {
      alt: 'A purple LED grid forming a pattern',
      src: '/photo-1464983953574-0892a716854b',
      origin: `${UNSPLASH_URL}/photos/a-purple-led-grid-forming-a-pattern-hGV2TfOh0ns`,
      creator: '@dan_carlson',
    },
  },
  [projectSlugs.csCMSTooling]: {
    slug: projectSlugs.csCMSTooling,
    title: 'Case Study 3: Winc — Self-Serve Landing Page CMS',
    description:
      'From 3 pages per week to 200+ in two months: building self-serve tooling that eliminated engineering bottlenecks.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csCMSTooling}`,
    },
    featured: true,
    cover: {
      alt: 'An open book on a lit desk',
      src: '/photo-1515378791036-0648a3ef77b2',
      origin: `${UNSPLASH_URL}/photos/an-open-book-on-a-lit-desk-wrHIcAR0AWc`,
      creator: '@green_chameleon',
    },
  },

  [projectSlugs.csModernPractice]: {
    slug: projectSlugs.csModernPractice,
    title: 'Case Study: Modern Practice — Web Engineering Best Practices',
    description:
      'Building this portfolio: NX monorepo, GSAP animations, full test coverage, and what I learned along the way.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csModernPractice}`,
    },
    cover: {
      alt: 'A developer desk with modern gadgets and screens showing code',
      src: '/photo-1519389950473-47ba0277781c',
      origin: `${UNSPLASH_URL}/photos/a-modern-desk-with-monitors-UQ9U_uwRX9A`,
      creator: '@matthewhenry',
    },
  },
  [projectSlugs.csA11y]: {
    slug: projectSlugs.csA11y,
    title: 'Case Study: Accessibility Serials — Real-World A11y Solutions',
    description:
      'Fixing 200+ WCAG violations across legacy systems—and building accessibility into everything since.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csA11y}`,
    },
    cover: {
      alt: 'Closeup of hands reading braille on a tactile page',
      src: '/photo-1465101162946-4377e57745c3',
      origin: `${UNSPLASH_URL}/photos/closeup-of-braille-page-OzAeZPNsLXk`,
      creator: '@sigmund',
    },
  },
  [projectSlugs.csLogisticsDashboard]: {
    slug: projectSlugs.csLogisticsDashboard,
    title: 'Case Study: Logistics Dashboard MVP — Next.js & AWS Cognito',
    description:
      'Shipping a logistics dashboard MVP with Next.js and AWS Cognito for a seed-stage venture.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csLogisticsDashboard}`,
    },
    cover: {
      alt: 'A screenshot of a dashboard interface with charts and data visualization',
      src: '/photo-1504384308090-c894fdcc538d',
      origin: `${UNSPLASH_URL}/photos/dashboard-charts-pypeCEaJeZY`,
      creator: '@lukechesser',
    },
  },
  [projectSlugs.uiV1]: {
    slug: projectSlugs.uiV1,
    title: 'Building a Design System: UI Components for danieljoffe.com',
    description:
      "This portfolio's design system: 20+ documented components built with accessibility and reusability in mind.",
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.uiV1}`,
    },
    cover: {
      alt: 'An image of a jellyfish in the dark',
      src: `/photo-1636576109679-6f23fdc040c8`,
      origin: `${UNSPLASH_URL}/photos/an-image-of-a-jellyfish-in-the-dark-4ckVcNeshmQ`,
      creator: '@and_machines',
    },
  },
  [projectSlugs.csContactForm]: {
    slug: projectSlugs.csContactForm,
    title: 'Defense in Depth — Building a Secure Contact Form',
    description:
      'From zero to a production-hardened contact form in 48 hours: hCaptcha, rate limiting, honeypot fields, input sanitization, and layered server-side validation.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csContactForm}`,
    },
    cover: {
      alt: 'Black iPhone with lock icon on yellow textile',
      src: '/photo-1603899122634-f086ca5f5ddd',
      origin: `${UNSPLASH_URL}/photos/black-iphone-5-on-yellow-textile-DoWZMPZ-M9s`,
      creator: '@franckinjapan',
    },
  },
  [projectSlugs.csAppContext]: {
    slug: projectSlugs.csAppContext,
    title: 'From Monolith to Composition — Simplifying AppContext',
    description:
      'How splitting a monolithic GlobalProvider into focused, composable providers eliminated tree-wide re-renders and improved developer ergonomics.',
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.csAppContext}`,
    },
    cover: {
      alt: 'Abstract connected nodes forming a network',
      src: '/photo-1558494949-ef010cbdcc31',
      origin: `${UNSPLASH_URL}/photos/blue-and-red-light-illustration-FPNnKfjcbNU`,
      creator: '@jjying',
    },
  },
  [projectSlugs.uiV2]: {
    slug: projectSlugs.uiV2,
    title: 'Expanding the Design System: UI Components Part 2',
    description:
      "This portfolio's design system: form controls, feedback, and layout primitives completing the component library.",
    link: {
      href: `${PROJECTS_LINK.href}/${projectSlugs.uiV2}`,
    },
    cover: {
      alt: 'Abstract purple geometric shapes',
      src: `/photo-1636576109679-6f23fdc040c8`,
      origin: `${UNSPLASH_URL}/photos/an-image-of-a-jellyfish-in-the-dark-4ckVcNeshmQ`,
      creator: '@and_machines',
    },
  },
};
