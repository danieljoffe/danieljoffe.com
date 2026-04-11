import { Metadata } from 'next';
import { DOMAIN_URL, FULL_NAME, EXPERIENCE_LINK } from '@/utils/constants';

export const experienceRootMetadata: Metadata = {
  title: `Experience | ${FULL_NAME} - Full-Stack Engineer`,
  description:
    'Five companies, ten years. Every engagement left the team faster and more autonomous than I found them.',
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
      'Five companies, ten years. Every engagement left the team faster and more autonomous than I found them.',
    url: `${DOMAIN_URL}${EXPERIENCE_LINK.href}`,
    type: 'website',
    siteName: FULL_NAME,
  },
  twitter: {
    title: `${FULL_NAME} - Professional Experience & Work History`,
    description:
      'Five companies, ten years. Every engagement left the team faster and more autonomous.',
    card: 'summary_large_image',
  },
};
