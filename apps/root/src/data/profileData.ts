import {
  EMAIL_ADDRESS,
  GITHUB_PROFILE_URL,
  JOB_TITLE,
  LINKEDIN_PROFILE_URL,
  FULL_NAME,
} from '@/utils/constants';

export const profileData = {
  name: FULL_NAME,
  title: JOB_TITLE,
  tagline: 'I help startups ship faster and build without friction.',
  status: 'Taking on 1–2 projects at a time.',
  social: {
    email: EMAIL_ADDRESS,
    linkedin: LINKEDIN_PROFILE_URL,
    github: GITHUB_PROFILE_URL,
  },
};
