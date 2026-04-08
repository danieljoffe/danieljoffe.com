import { Metadata } from 'next';
import { DOMAIN_URL, FULL_NAME, EXPERIENCE_LINK } from '@/utils/constants';

export const experienceRootMetadata: Metadata = {
  title: `Experience | ${FULL_NAME} - Full-Stack Engineer`,
  description:
    'My professional journey as a full-stack engineer: key roles, impactful projects, and the technical expertise behind performant, user-focused web applications.',
  keywords: [
    FULL_NAME,
    'Portfolio',
    'Experience',
    'Work History',
    'Professional Experience',
    'Full-Stack Engineer',
    'Software Engineer',
    'Frontend Engineer',
    'Career Journey',
    'Work Experience',
    'Professional Background',
    'Web Development',
    'Software Development',
  ],
  alternates: {
    canonical: EXPERIENCE_LINK.href,
  },
  openGraph: {
    title: `${FULL_NAME} - Professional Experience & Work History`,
    description:
      'My professional journey as a full-stack engineer: key roles, impactful projects, and the technical expertise behind performant, user-focused web applications.',
    url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}`,
    type: 'website',
    siteName: FULL_NAME,
  },
  twitter: {
    title: `${FULL_NAME} - Professional Experience & Work History`,
    description:
      'My professional journey as a full-stack engineer: key roles, impactful projects, and technical expertise.',
    card: 'summary_large_image',
  },
};
