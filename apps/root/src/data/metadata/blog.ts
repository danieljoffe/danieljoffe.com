import { Metadata } from 'next';

export const blogRootMetadata: Metadata = {
  // Bare segment — the root layout's title.template appends
  // " | Daniel Joffe - Full-Stack Engineer". Including the suffix here
  // doubled it (e.g. "Blog | … | …").
  title: 'Blog',
  description:
    "Notes from shipping code. Deep-dives on the problems I've debugged, the patterns I've extracted, and the decisions I'd make differently next time.",
  keywords: [
    'Daniel Joffe',
    'Blog',
    'Frontend',
    'Full-Stack',
    'Web Development',
    'React',
    'Next.js',
    'TypeScript',
    'Performance',
    'Architecture',
  ],
  alternates: {
    canonical: '/blog',
  },
  openGraph: {
    title: 'Daniel Joffe - Blog',
    description:
      "Notes from shipping code. Deep-dives on the problems I've debugged, the patterns I've extracted, and the decisions I'd make differently next time.",
    url: 'https://danieljoffe.com/blog',
    type: 'website',
    siteName: 'Daniel Joffe',
  },
  twitter: {
    title: 'Daniel Joffe - Blog',
    description:
      'Notes from shipping code. Debugging, patterns, and lessons learned.',
    card: 'summary_large_image',
  },
};
