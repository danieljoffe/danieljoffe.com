import {
  LINKEDIN_PROFILE_URL,
  DOMAIN_URL,
  JOB_TITLE,
  FULL_NAME,
  GITHUB_PROFILE_URL,
  EMAIL_ADDRESS,
} from '@/utils/constants';

// Structured data for better SEO
export const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: FULL_NAME,
  jobTitle: JOB_TITLE,
  description: `${FULL_NAME} is a Senior Frontend Engineer with 8+ years of experience specializing in performance optimization and component architecture`,
  url: DOMAIN_URL,
  email: EMAIL_ADDRESS,
  sameAs: [LINKEDIN_PROFILE_URL, GITHUB_PROFILE_URL],
  knowsAbout: [
    'React',
    'Angular',
    'JavaScript',
    'TypeScript',
    'Node.js',
    'Web Development',
    'Infrastructure',
    'Performance Optimization',
    'Full-Stack Development',
    'Frontend Development',
    'Backend Development',
    'Software Engineering',
    'Technical Leadership',
  ],
  hasOccupation: {
    '@type': 'Occupation',
    name: JOB_TITLE,
    description: `${FULL_NAME} is a Senior Frontend Engineer with 8+ years of experience specializing in performance optimization, component architecture, and accessible web applications.`,
    occupationLocation: {
      '@type': 'Place',
      addressCountry: 'US',
    },
  },
  worksFor: {
    '@type': 'Organization',
    name: `${FULL_NAME} - Self-employed / Contract Work`,
  },
  alumniOf: {
    '@type': 'Organization',
    name: 'Various Technology Companies',
  },
  hasCredential: {
    '@type': 'EducationalOccupationalCredential',
    name: '8+ Years Software Engineering Experience',
    credentialCategory: 'Professional Experience',
  },
};
