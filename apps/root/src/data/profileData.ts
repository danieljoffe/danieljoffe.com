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
  tagline: 'Senior frontend craft, full-stack ownership.',
  status: 'Open to full-time roles with product-focused teams.',
  social: {
    email: EMAIL_ADDRESS,
    linkedin: LINKEDIN_PROFILE_URL,
    github: GITHUB_PROFILE_URL,
  },
};
