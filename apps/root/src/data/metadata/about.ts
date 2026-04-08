import { Metadata } from 'next';

export const aboutMetadata: Metadata = {
  title: 'About Daniel Joffe | Full-Stack Engineer & Technical Leader',
  description:
    '10+ years building performant web applications. Specializing in React, Vue, TypeScript, and performance optimization.',
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
    description: `10+ years of full-stack engineering. Career timeline, technical expertise, and contact form.`,
    url: `https://danieljoffe.com/about`,
    type: 'website',
    siteName: 'Daniel Joffe',
  },
  twitter: {
    title: `About Daniel Joffe - Professional Journey & Experience`,
    description: `Background, values, and experience. Includes career timeline and mantra.`,
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
