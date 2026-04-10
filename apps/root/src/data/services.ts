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
import { projectSlugs } from '@/data/project';

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

export const performanceAuditsSection: ServiceSectionData = {
  id: 'performance-audits',
  painPoint: {
    headline:
      "Your site takes 8 seconds to load. You're losing 53% of mobile visitors before they see your content.",
    subtext: undefined,
  },
  description:
    "I measure exactly what's slowing your site down, fix the biggest bottlenecks, and prove the improvement with before/after metrics.",
  questions: [
    {
      question: 'How is this different from running PageSpeed Insights?',
      answer:
        'PageSpeed gives you a score. I give you a fixed site. I diagnose root causes — render-blocking resources, unoptimized images, bloated bundles — implement the fixes, and measure the real-world impact.',
    },
    {
      question: 'Do Core Web Vitals really affect search rankings?',
      answer:
        'Yes. Google uses Core Web Vitals as a ranking signal. Poor performance means lower visibility, fewer clicks, and lost revenue.',
    },
    {
      question: 'What platforms do you work with?',
      answer:
        "React, Next.js, Vue, WordPress, Shopify — performance principles apply universally. The tooling changes, but the methodology doesn't.",
    },
    {
      question: 'How do you measure improvement?',
      answer:
        'Before/after Lighthouse audits, Core Web Vitals field data, and real user metrics. You get a clear report showing exactly what changed and by how much.',
    },
    {
      question: 'What kind of ROI can I expect?',
      answer:
        "Faster sites convert better. A 1-second improvement in load time can increase conversions by 7%. I've seen bounce rates drop 39% and page views increase significantly after optimization work.",
    },
  ],
  deliverables: [
    'Lighthouse & Core Web Vitals audit report',
    'Prioritized fix recommendations with effort estimates',
    'Implementation of top-priority improvements',
    'Before/after performance metrics report',
  ],
  proof: {
    title: 'FightCamp Performance Overhaul',
    metrics: [
      {
        label: 'Lighthouse Score',
        before: '32–43',
        after: '~80',
        improvement: '+40 points',
        delta: 'positive',
      },
      {
        label: 'Bundle Size',
        before: '650–800KB',
        after: '250–300KB',
        improvement: '~62% reduction',
        delta: 'positive',
      },
      {
        label: 'Mobile Bounce Rate',
        before: 'High',
        after: '−39%',
        improvement: '39% drop',
        delta: 'positive',
      },
      {
        label: 'First Contentful Paint',
        before: '8–12s',
        after: '1.8–2.5s',
        improvement: '~80% faster',
        delta: 'positive',
      },
    ],
    caseStudySlug: projectSlugs.csPerformance,
  },
  timeline: '2–4 weeks',
  price: '$5,000',
  ctaLabel: undefined,
  ctaHref: undefined,
};

export const cmsToolingSection: ServiceSectionData = {
  id: 'cms-tooling',
  painPoint: {
    headline:
      'Your marketing team files an engineering ticket every time they need a landing page changed.',
    subtext: undefined,
  },
  description:
    'I build tooling that gives non-technical teams full autonomy over content and landing pages — without risking broken layouts or needing a developer on call.',
  questions: [
    {
      question:
        'We already have a CMS. Can you improve it instead of replacing it?',
      answer:
        'Absolutely. Most of my work is improving what you already have — better content models, composable page sections, and guardrails that prevent accidental breakage.',
    },
    {
      question: 'What CMS platforms do you work with?',
      answer:
        "Contentful, Storyblok, Sanity, headless WordPress, and custom admin panels. I pick what fits your team's workflow and technical constraints.",
    },
    {
      question: 'Will non-technical people actually be able to use it?',
      answer:
        "That's the whole point. I design the editing interface for marketers, not developers. I include training, documentation, and guardrails so your team can't accidentally break the layout.",
    },
    {
      question: 'What if we only need landing pages for now?',
      answer:
        "That's the best place to start. Landing pages are high-impact and low-risk — perfect for proving out self-serve tooling before expanding to other content types.",
    },
    {
      question: 'How do you prevent accidental layout breaks?',
      answer:
        "Composable components with constrained options. Your team picks from pre-built sections and fills in content — they can't accidentally break the grid or mess up spacing.",
    },
  ],
  deliverables: [
    'CMS architecture and implementation',
    'Composable page builder components',
    'Content editing guardrails',
    'Team training and documentation',
  ],
  proof: {
    title: 'Winc Landing Page Engine',
    metrics: [
      {
        label: 'Landing Pages/Month',
        before: '12',
        after: '200+',
        improvement: '1,600% increase',
        delta: 'positive',
      },
      {
        label: 'Weekly Velocity',
        before: '3–4 pages',
        after: '8–12 pages',
        improvement: '3× throughput',
        delta: 'positive',
      },
      {
        label: 'Engineering Time Saved',
        before: '12+ hrs/week',
        after: '0',
        improvement: 'Full autonomy',
        delta: 'positive',
      },
      {
        label: 'Conversion Rate',
        before: '1.4%',
        after: '2.0%',
        improvement: '+43% lift',
        delta: 'positive',
      },
    ],
    caseStudySlug: 'cms-tooling-case-study',
  },
  timeline: '3–6 weeks',
  price: '$8,000',
  ctaLabel: undefined,
  ctaHref: undefined,
};

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

export const mvpBuildsSection: ServiceSectionData = {
  id: 'mvp-builds',
  painPoint: {
    headline:
      "You have a product idea, a market opportunity, and a window that's closing. You need a working product, not a roadmap.",
    subtext:
      "Or: your last developer left. There's a half-built codebase, no documentation, and a deadline.",
  },
  description:
    'I build production-ready MVPs from scratch or rescue stalled projects — frontend, backend integration, authentication, and deployment. You get a working product and clean handoff documentation.',
  questions: [
    {
      question: 'Can you work with my existing API or backend?',
      answer:
        'Yes. I integrate with any REST or GraphQL API. If you need backend work too, I handle Node.js, Express, and serverless architectures.',
    },
    {
      question: 'What if I have a half-built codebase from another developer?',
      answer:
        "I start with an honest codebase audit. I'll tell you what's salvageable, what needs rewriting, and give you a realistic timeline before we commit to anything.",
    },
    {
      question: "I don't have a designer. Can you still build something good?",
      answer:
        'Yes. I use proven UI patterns, component libraries, and clean layouts to build interfaces that look professional without needing custom design. If you bring designs later, the code adapts.',
    },
    {
      question: "Who owns the code when we're done?",
      answer:
        'You do. 100%. You get the full codebase, deployment access, documentation, and a walkthrough. No lock-in, no dependencies on me.',
    },
    {
      question: 'What happens after launch?',
      answer:
        'I offer monthly retainers for ongoing support, or I hand off completely with documentation your team can maintain. Your call.',
    },
  ],
  deliverables: [
    'Complete full-stack MVP application',
    'Responsive, accessible user interface',
    'Authentication and state management',
    'CI/CD pipeline and hosting setup',
    'Knowledge transfer documentation',
  ],
  proof: {
    title: 'Logistics Dashboard MVP',
    metrics: [
      {
        label: 'Delivery Timeline',
        before: 'No product',
        after: '3 months',
        improvement: 'On-time delivery',
        delta: 'positive',
      },
      {
        label: 'Authentication',
        before: 'None',
        after: 'AWS Cognito',
        improvement: 'Enterprise-grade',
        delta: 'positive',
      },
      {
        label: 'User Roles',
        before: '0',
        after: '3',
        improvement: 'Role-based access',
        delta: 'neutral',
      },
    ],
    caseStudySlug: 'logistics-dashboard-study-case',
  },
  timeline: '4–12 weeks',
  price: '$12,000',
  ctaLabel: undefined,
  ctaHref: undefined,
};

export interface PainPointMatcher {
  problem: string;
  service: string;
  price: string;
  anchor: string;
}

export const painPointMatchers: PainPointMatcher[] = [
  {
    problem: "My site is slow and we're losing conversions",
    service: 'Performance Audit',
    price: '$5,000',
    anchor: '#performance-audits',
  },
  {
    problem: 'Our team rebuilds the same components on every project',
    service: 'Component Library',
    price: '$10,000',
    anchor: '#component-libraries',
  },
  {
    problem: 'Marketing depends on engineering for every content change',
    service: 'CMS & Tooling',
    price: '$8,000',
    anchor: '#cms-tooling',
  },
  {
    problem: 'We have a product idea but no frontend team',
    service: 'MVP Build',
    price: '$12,000',
    anchor: '#mvp-builds',
  },
];

export interface ServiceComparisonRow {
  [key: string]: string;
  attribute: string;
  performanceAudit: string;
  componentLibrary: string;
  cmsTooling: string;
  mvpBuild: string;
}

export const serviceComparisons: ServiceComparisonRow[] = [
  {
    attribute: 'Timeline',
    performanceAudit: '2–4 weeks',
    componentLibrary: '4–8 weeks',
    cmsTooling: '3–6 weeks',
    mvpBuild: '4–12 weeks',
  },
  {
    attribute: 'Starting Price',
    performanceAudit: '$5,000',
    componentLibrary: '$10,000',
    cmsTooling: '$8,000',
    mvpBuild: '$12,000',
  },
  {
    attribute: 'Best For',
    performanceAudit: 'Slow sites losing users',
    componentLibrary: 'Teams with inconsistent UI',
    cmsTooling: 'Marketing bottlenecked by eng',
    mvpBuild: 'New products or rescues',
  },
  {
    attribute: 'Key Deliverable',
    performanceAudit: 'Performance metrics report',
    componentLibrary: 'Documented component library',
    cmsTooling: 'Self-serve page builder',
    mvpBuild: 'Production-ready application',
  },
];

export const serviceSections: ServiceSectionData[] = [];
