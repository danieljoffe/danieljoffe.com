import { ProfilePage, WithContext } from 'schema-dts';
import {
  DOMAIN_URL,
  EMAIL_ADDRESS,
  FULL_NAME,
  GITHUB_PROFILE_URL,
  JOB_TITLE,
  LINKEDIN_PROFILE_URL,
} from '@/utils/constants';

export const resumeStructuredData: WithContext<ProfilePage> = {
  '@context': 'https://schema.org',
  '@type': 'ProfilePage',
  url: `${DOMAIN_URL}/resume`,
  name: `${FULL_NAME} — Résumé`,
  mainEntity: {
    '@type': 'Person',
    name: FULL_NAME,
    jobTitle: JOB_TITLE,
    email: `mailto:${EMAIL_ADDRESS}`,
    url: DOMAIN_URL,
    sameAs: [LINKEDIN_PROFILE_URL, GITHUB_PROFILE_URL],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Los Angeles',
      addressRegion: 'CA',
      addressCountry: 'US',
    },
    knowsAbout: [
      'React',
      'TypeScript',
      'Next.js',
      'Node.js',
      'Python',
      'FastAPI',
      'Supabase',
      'Web Performance',
      'Accessibility',
      'Design Systems',
    ],
    alumniOf: [
      { '@type': 'CollegeOrUniversity', name: 'Western Governors University' },
      { '@type': 'EducationalOrganization', name: 'General Assembly' },
    ],
  },
};
