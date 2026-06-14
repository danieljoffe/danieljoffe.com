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
    description: `Background, values, and experience. Includes career timeline and guiding principles.`,
    card: 'summary_large_image',
    creator: '@danieljoffe',
  },
  // Note: the profile <Image> on /about already sets `priority`, which emits
  // a correct <link rel="preload" as="image">. A manual icons.other preload
  // here was redundant and rendered without a valid `as` (console warning),
  // so it was removed.
};
