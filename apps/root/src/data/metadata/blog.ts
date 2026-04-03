import { Metadata } from 'next';

export const blogRootMetadata: Metadata = {
  title: 'Blog | Daniel Joffe - Full-Stack Engineer',
  description:
    'Technical deep-dives, opinions on frontend trends, tutorials, and lessons learned from a full-stack engineer.',
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
      'Technical deep-dives, opinions on frontend trends, tutorials, and lessons learned.',
    url: 'https://danieljoffe.com/blog',
    type: 'website',
    siteName: 'Daniel Joffe',
  },
  twitter: {
    title: 'Daniel Joffe - Blog',
    description:
      'Technical deep-dives, opinions on frontend trends, tutorials, and lessons learned.',
    card: 'summary_large_image',
  },
};
