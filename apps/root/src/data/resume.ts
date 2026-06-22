// Résumé content for the /resume web page. Source of truth is Daniel's
// résumé Google Doc (RESUME_URL); transcribed here so the page is indexable,
// linkable, and styled to match the rest of the site. Keep in sync with the Doc.

export interface ResumeRole {
  company: string;
  role: string;
  period: string;
  location: string;
  bullets: string[];
}

export interface ResumeSkillGroup {
  label: string;
  skills: string[];
}

export interface ResumeProject {
  name: string;
  description: string;
}

export interface ResumeEducation {
  school: string;
  credential: string;
  detail: string | undefined;
}

// Years framing harmonized to the rest of the site ("over a decade" / "10+
// years"); the Doc currently reads "8+ years" — reconcile there.
export const resumeSummary =
  'Senior full-stack engineer with over a decade shipping production software — React/TypeScript on the frontend, Node.js and Python/FastAPI with Supabase on the backend. I led the performance overhaul at FightCamp (10s → 2s mobile load, +40 Lighthouse, −39% bounce), built a React component library adopted by ~80% of applications at Internet Brands, and shipped a self-serve CMS at Winc that unblocked 200+ marketing pages. Equally comfortable owning features end-to-end at an early-stage startup or raising the reliability bar on a larger team.';

export const resumeSkills: ResumeSkillGroup[] = [
  {
    label: 'Frontend',
    skills: [
      'React',
      'TypeScript',
      'JavaScript',
      'Next.js',
      'Vue/Nuxt',
      'Angular',
      'Redux',
      'Tailwind',
      'GSAP',
      'Storybook',
      'Storyblok CMS',
    ],
  },
  {
    label: 'Backend',
    skills: [
      'Node.js',
      'Express',
      'Python/FastAPI',
      'REST APIs',
      'Supabase (Postgres, RLS, Edge Functions)',
      'AWS S3/Cognito',
    ],
  },
  {
    label: 'Tooling',
    skills: [
      'Jest',
      'Playwright',
      'Cypress',
      'Nx monorepo',
      'Webpack',
      'GitHub Actions CI/CD',
      'Lighthouse',
      'ESLint/Prettier/Husky',
    ],
  },
  {
    label: 'Familiar',
    skills: ['Redis', 'Docker', 'GraphQL', 'Electron', 'React Native'],
  },
];

export const resumeExperience: ResumeRole[] = [
  {
    company: 'FightCamp',
    role: 'Full-Stack Engineer',
    period: 'Nov 2021 – Jan 2023',
    location: 'Remote',
    bullets: [
      'Self-initiated a performance overhaul that cut mobile First Contentful Paint from ~10s to ~2s and raised Lighthouse scores by 40+ points across all pages.',
      'Reduced bundle size by ~62% (650–800 KB down to 250–300 KB) and cut mobile bounce rate by ~39%.',
      "Architected a lazy-load video component that prevented 500–800 MB of per-page downloads; adopted as the team's default pattern.",
      'Recognized the same marketing-blocked-on-engineering pattern from Winc and led a Storyblok CMS migration that cut engineering involvement in marketing deployments by ~80%.',
      'Built A/B testing infrastructure on Google Optimize across copy, video, image, and offer variants; ran quarterly experiments on 2-week test cycles.',
      'Mentored a junior developer through pair programming and code review; promoted to Front-End Developer within one year.',
    ],
  },
  {
    company: 'The Library Corporation',
    role: 'Software Engineer',
    period: 'Sep 2019 – Nov 2021',
    location: 'Remote',
    bullets: [
      'Sole frontend engineer for ~23 months on a platform serving 5,500+ library clients and thousands of catalogers.',
      'Resolved 200+ WCAG accessibility violations and set the accessibility-first standard for the platform.',
      'Led a year-long serials cataloging project, more than doubling features and cutting backlog by a quarter.',
    ],
  },
  {
    company: 'Internet Brands',
    role: 'Frontend Developer',
    period: 'Mar 2018 – Aug 2019',
    location: 'El Segundo, CA',
    bullets: [
      'Built a centralized React component library adopted by ~80% of company applications, growing from 12 to 30+ documented components.',
      "Trained 7 developers on library contribution patterns; mentored 4 junior engineers (one advanced to NASA's Jet Propulsion Laboratory, one to Senior Engineer).",
      'Sole hiring lead after the senior departed; interviewed 13 candidates and rebuilt the team.',
      'Re-architected a desktop-only patient messaging app for mobile-first in under a month, partnering with design on UX and brand alignment.',
      'Took over a stalled doctor-to-doctor communication platform and led a team of 6 to ship it in ~1 month.',
    ],
  },
  {
    company: 'Winc (fka ClubW)',
    role: 'Frontend Developer',
    period: 'Jun 2015 – Oct 2017',
    location: 'Los Angeles, CA',
    bullets: [
      'Proposed and built a self-serve landing-page CMS as an unsolicited side project; demoed to the VP and shipped it to 4 marketing users — 200+ campaign pages in 2 months versus the prior 4+ week minimum.',
      'Eliminated 12+ engineering hours/week; the marketing team averaged 8–12 pages/week operating independently.',
      "Led the ClubW → Winc rebrand at the CEO's request; restyled the entire application in ~1 month.",
    ],
  },
];

export const resumeProjects: ResumeProject[] = [
  {
    name: 'Job application pipeline',
    description:
      'Python/FastAPI microservice on Railway that polls Greenhouse boards asynchronously, scores postings via weighted keyword matching, and persists to Supabase (row-level security, dedup on greenhouse_id). Next.js admin dashboard behind JWT-cookie auth; Vercel cron automation. Security hardening throughout: timing-safe credential comparisons, Pydantic Literal/regex validation, TrustedHostMiddleware. 901 Node + 54 Python tests passing.',
  },
  {
    name: 'shared-ui (ui.danieljoffe.com)',
    description:
      'A reusable React + TypeScript + Tailwind component library that powers every surface of danieljoffe.com; documented in Storybook and published as its own deployable npm package.',
  },
  {
    name: 'danieljoffe.com',
    description:
      'Portfolio built as a modern-practice showcase: Nx monorepo, pre-commit hooks enforcing ESLint/Prettier/Jest/Playwright/Lighthouse, GSAP animations, Vercel + GitHub Actions CI/CD.',
  },
  {
    name: 'Logistics Dashboard (contract, 2023)',
    description:
      'Next.js + TypeScript with AWS Cognito role-based auth; shipped the MVP for a seed-stage venture.',
  },
];

export const resumeEducation: ResumeEducation[] = [
  {
    school: 'Western Governors University',
    credential: 'B.S. Computer Science',
    detail: 'Expected May 2027',
  },
  {
    school: 'General Assembly',
    credential: 'Full-Stack Web Development Bootcamp',
    detail: undefined,
  },
];
