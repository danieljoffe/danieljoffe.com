import {
  type LucideIcon,
  Rocket,
  Wrench,
  FileText,
  Monitor,
  TrendingUp,
  Building2,
  Target,
} from 'lucide-react';
import type { Metric } from '@/components/kit/MetricsDashboard';

interface Service {
  Icon: LucideIcon;
  title: string;
  highlighted: boolean;
  description: string;
  deliverables: string[];
  proof: string;
  timeline: string;
  price: string;
}

interface Audience {
  Icon: LucideIcon;
  label: string;
  description: string;
}

export interface ServiceSectionData {
  id: string;
  painPoint: { headline: string; subtext: string | undefined };
  description: string;
  questions: Array<{ question: string; answer: string }>;
  deliverables: string[];
  proof: { title: string; metrics: Metric[]; caseStudySlug: string };
  timeline: string;
  price: string;
  ctaLabel: string | undefined;
  ctaHref: string | undefined;
}

export const services: Service[] = [
  {
    Icon: Rocket,
    title: 'Performance Audits & Optimization',
    highlighted: true,
    description:
      'Your site is slow and users are bouncing. I diagnose the root causes (bloated bundles, unoptimized assets, layout shifts) and fix them systematically.',
    deliverables: [
      'Lighthouse & Core Web Vitals audit with prioritized action plan',
      'Implementation of fixes (lazy loading, image/video optimization, bundle analysis)',
      'Before/after metrics report',
    ],
    proof:
      'Cut mobile load times from 10s to 2s and reduced bounce rates by 39% at FightCamp.',
    timeline: '2-4 weeks',
    price: '$5,000',
  },
  {
    Icon: Wrench,
    title: 'Component Libraries & Design Systems',
    highlighted: false,
    description:
      'Your codebase has inconsistent UI, duplicated components, and no documentation. I build shared component systems that scale.',
    deliverables: [
      'Audit of existing components for consolidation',
      'Documented component library in Storybook',
      'Contribution guidelines so your team can maintain it',
    ],
    proof:
      'Built a React component library adopted by 80% of applications at Internet Brands, then trained 7 developers to contribute.',
    timeline: '4-8 weeks',
    price: '$10,000',
  },
  {
    Icon: FileText,
    title: 'CMS & Self-Serve Tooling',
    highlighted: false,
    description:
      'Your marketing team submits engineering tickets to change a headline. I build tooling that gives non-technical teams full autonomy.',
    deliverables: [
      'CMS architecture and implementation (Storyblok, Contentful, or custom)',
      'Composable page builder components',
      'Training and documentation for your team',
    ],
    proof:
      'Built CMS tooling that let marketing launch 200+ landing pages in 2 months at Winc, and reduced engineering requests by 80% at FightCamp.',
    timeline: '3-6 weeks',
    price: '$8,000',
  },
  {
    Icon: Monitor,
    title: 'MVP & Product Frontend Builds',
    highlighted: false,
    description:
      'You have a backend or an idea and need a production-quality frontend, fast. I architect and build complete frontend applications.',
    deliverables: [
      'Frontend architecture (Next.js, React, TypeScript)',
      'Responsive, accessible UI implementation',
      'Authentication, state management, API integration',
      'Deployment and handoff documentation',
    ],
    proof:
      'Built a logistics dashboard MVP with Next.js and AWS Cognito auth for a seed-stage venture in 3 months.',
    timeline: '4-12 weeks',
    price: '$12,000',
  },
];

export const servicesAudience: Audience[] = [
  {
    Icon: Rocket,
    label: 'Founders',
    description:
      'who need a senior full-stack partner, not just a pair of hands',
  },
  {
    Icon: TrendingUp,
    label: 'Growing startups',
    description: 'whose engineering team is stretched thin',
  },
  {
    Icon: Building2,
    label: 'Agencies',
    description:
      'that need overflow capacity from someone who can own a project end-to-end',
  },
  {
    Icon: Target,
    label: 'Non-technical teams',
    description: 'drowning in engineering dependency for basic updates',
  },
];

export const howItWorks = [
  {
    number: '1',
    title: 'Discovery Call (Free)',
    description:
      "We talk about your problem, timeline, and budget. No pitch decks. I'll tell you honestly whether I'm the right fit.",
  },
  {
    number: '2',
    title: 'Scope & Proposal',
    description:
      'You get a clear scope document with deliverables, timeline, and fixed price. No hourly surprises.',
  },
  {
    number: '3',
    title: 'Build & Ship',
    description:
      'I work in weekly sprints with async updates. You see progress every week, not just at the end.',
  },
  {
    number: '4',
    title: 'Handoff & Support',
    description:
      "Clean code, documentation, and a walkthrough. I don't leave you with a codebase nobody can maintain.",
  },
];

export const servicesFAQs = [
  {
    question: "What's your availability?",
    answer:
      "I take on 1-2 projects at a time to ensure quality. I'm currently available — reach out to discuss your timeline.",
  },
  {
    question: 'Do you do hourly work?',
    answer:
      "I prefer project-based pricing so we're both aligned on outcomes, not hours. For ongoing partnerships, I offer monthly retainers.",
  },
  {
    question: "What's your tech stack?",
    answer:
      "React, Next.js, TypeScript, Vue/Nuxt, Tailwind CSS. I'm framework-flexible—I pick whatever solves your problem best.",
  },
  {
    question: 'Can you work with my existing team?',
    answer:
      "Absolutely. I've led teams of up to 6 developers and regularly collaborate with designers, PMs, and backend engineers.",
  },
  {
    question: 'What about ongoing maintenance?',
    answer:
      'I offer monthly retainer packages for teams that need continued engineering support after the initial build.',
  },
];

export const componentLibrariesSection: ServiceSectionData = {
  id: 'component-libraries',
  painPoint: {
    headline:
      'Your team rebuilds the same button, modal, and form on every project. Each one looks slightly different.',
    subtext: undefined,
  },
  description:
    'I consolidate your UI into a single, documented component library that your whole team shares. Build once, use everywhere.',
  questions: [
    {
      question: "We're not using React. Can you still help?",
      answer:
        "Yes. I've built component libraries in React, Vue, and framework-agnostic Web Components. The approach adapts to your stack.",
    },
    {
      question: "We already have components, they're just messy.",
      answer:
        "That's the most common starting point. I audit what you have, consolidate duplicates, standardize patterns, and document everything — no need to start from scratch.",
    },
    {
      question: 'How do you handle adoption across the team?',
      answer:
        'I build the library with your developers, not in isolation. I include contribution guidelines, run training sessions, and set up Storybook so everyone can discover and use components independently.',
    },
    {
      question: 'Is this worth it for a small team of 2-3 developers?',
      answer:
        "Especially for small teams. A shared library eliminates the 'which button do I use?' question and lets you ship faster instead of rebuilding the same UI patterns.",
    },
    {
      question: 'What about design tokens and theming?',
      answer:
        'I set up a token-based system (colors, spacing, typography) that makes global updates trivial. Change a token, update everywhere.',
    },
  ],
  deliverables: [
    'Component consolidation audit',
    'Shared component library with TypeScript',
    'Interactive Storybook documentation',
    'Contribution guidelines and team training',
  ],
  proof: {
    title: 'Internet Brands Design System',
    metrics: [
      {
        label: 'Delivery Time',
        before: '10 months',
        after: '1 month',
        improvement: '10× faster',
        delta: 'positive',
      },
      {
        label: 'Adoption Rate',
        before: '0%',
        after: '80%',
        improvement: 'Org-wide adoption',
        delta: 'positive',
      },
      {
        label: 'Documented Components',
        before: '0',
        after: '30+',
        improvement: 'Full coverage',
        delta: 'positive',
      },
      {
        label: 'Developers Trained',
        before: '0',
        after: '7',
        improvement: 'Team capability',
        delta: 'neutral',
      },
    ],
    caseStudySlug: 'component-library-case-study',
  },
  timeline: '4–8 weeks',
  price: '$10,000',
  ctaLabel: undefined,
  ctaHref: undefined,
};

export const serviceSections: ServiceSectionData[] = [];
