import { Metadata } from 'next';

export const homeMetadata: Metadata = {
  title: 'Full-Stack Engineer',
  description:
    'Full-Stack Engineer with 10+ years of frontend craft, shipping complete products — Next.js frontends, Python/FastAPI backends, and production LLM pipelines. Reduced load times by 80% at FightCamp.',
  keywords: [
    'Daniel Joffe',
    'Full-Stack Engineer',
    'Portfolio',
    'Web Development',
    'React',
    'Angular',
    'JavaScript',
    'TypeScript',
    'Infrastructure',
    'Performance Optimization',
    'Software Engineer',
    'Technical Leadership',
    'Frontend Development',
    'Backend Development',
    'Node.js',
    'Web Applications',
  ],
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: `Daniel Joffe | Full-Stack Engineer`,
    description:
      'Full-Stack Engineer specializing in performance optimization, backend architecture, and component systems. View achievements, methodology, and work samples.',
    url: 'https://danieljoffe.com',
    type: 'website',
    siteName: 'Daniel Joffe',
    // Explicit reference to the root-level app/opengraph-image.tsx — Next.js
    // doesn't auto-merge it across the (public) route group boundary, so the
    // homepage has been shipping with no og:image since release. Each project
    // / experience / blog page has its own segment-level opengraph-image.tsx
    // and gets auto-populated; the homepage is the one that needs the hint.
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Daniel Joffe — Full-Stack Engineer',
      },
    ],
  },
  twitter: {
    title: `Daniel Joffe | Full-Stack Engineer`,
    description:
      'Full-Stack Engineer. Performance optimization, backend architecture, and accessible web applications.',
    card: 'summary_large_image',
    creator: '@danieljoffe',
    images: ['/opengraph-image'],
  },
};
