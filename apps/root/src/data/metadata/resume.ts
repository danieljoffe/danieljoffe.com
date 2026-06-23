import { Metadata } from 'next';

export const resumeMetadata: Metadata = {
  // Page name only — the root metadata title template appends
  // "| Daniel Joffe - Full-Stack Engineer".
  title: 'Résumé',
  description:
    'Full-stack engineer résumé — React/TypeScript, Node.js, Python/FastAPI, and Supabase. Experience, technical skills, selected projects, and a downloadable PDF.',
  keywords: [
    'Daniel Joffe',
    'Résumé',
    'Resume',
    'CV',
    'Full-Stack Engineer',
    'React',
    'TypeScript',
    'Next.js',
    'Node.js',
    'Python',
    'FastAPI',
    'Supabase',
    'Hire',
  ],
  alternates: {
    canonical: '/resume',
  },
  openGraph: {
    title: 'Daniel Joffe — Résumé',
    description:
      'Full-stack engineer with over a decade shipping production software. Experience, skills, selected projects, and a downloadable PDF.',
    url: `https://danieljoffe.com/resume`,
    type: 'profile',
    siteName: 'Daniel Joffe',
  },
  twitter: {
    title: 'Daniel Joffe — Résumé',
    description:
      'Full-stack engineer — React/TypeScript, Node.js, Python/FastAPI, Supabase. Experience, skills, projects, and a downloadable PDF.',
    card: 'summary_large_image',
    creator: '@danieljoffe',
  },
};
