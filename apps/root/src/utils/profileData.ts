import {
  EMAIL_ADDRESS,
  GITHUB_PROFILE_URL,
  JOB_TITLE,
  LINKEDIN_PROFILE_URL,
  FULL_NAME,
} from './constants';

export const profileData = {
  name: FULL_NAME,
  title: JOB_TITLE,
  tagline:
    'I turn slow websites into fast ones. At FightCamp, I cut mobile load times from 10s to 2s. At Internet Brands, I built a component library used by 80% of applications.',
  status: 'Currently seeking remote or LA-based opportunities',
  social: {
    email: EMAIL_ADDRESS,
    linkedin: LINKEDIN_PROFILE_URL,
    github: GITHUB_PROFILE_URL,
  },
};
