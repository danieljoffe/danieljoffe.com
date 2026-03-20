import { Metadata } from 'next';

export const aboutMetadata: Metadata = {
  title: 'About Daniel Joffe | Frontend Engineer & Technical Leader',
  description:
    '8+ years building performant web applications. Specializing in React, Vue, TypeScript, and performance optimization. Currently completing CS degree at WGU.',
  keywords: [
    'Daniel Joffe',
    'About',
    'Experience',
    'Career Timeline',
    'Professional Journey',
    'Full-Stack Engineer',
    'Software Engineer',
    'Contact',
    'Work History',
    'Professional Background',
    'Technical Skills',
    'Career Development',
  ],
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    title: `About Daniel Joffe - Professional Journey & Experience`,
    description: `A concise look at background, values, and experience, including a timeline and mantra.`,
    url: `https://danieljoffe.com/about`,
    type: 'website',
    siteName: 'Daniel Joffe',
  },
  twitter: {
    title: `About Daniel Joffe - Professional Journey & Experience`,
    description: `Background, values, and experience—timeline and mantra included.`,
    card: 'summary_large_image',
    creator: '@danieljoffe',
  },
  icons: {
    other: [
      {
        url: '/images/daniel-joffe-profile.webp',
        rel: 'preload',
        fetchPriority: 'high',
        media: '(max-width: 768px)',
        type: 'image/png',
      },
    ],
  },
};
