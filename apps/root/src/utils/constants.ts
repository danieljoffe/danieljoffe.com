// ============================================================================
// EXTERNAL URLS
// ============================================================================
export const DOMAIN_URL = 'https://danieljoffe.com';
export const LINKEDIN_URL = 'https://www.linkedin.com';
export const GITHUB_URL = 'https://github.com';
export const UNSPLASH_URL = 'https://unsplash.com';
export const UNSPLASH_PHOTOS_URL = 'https://images.unsplash.com';
export const GOOGLE_DOCS_URL = 'https://docs.google.com';
export const EXAMPLE_URL = 'https://example.com';
export const GOOGLE_ANALYTICS_URL = 'https://www.google-analytics.com';
export const GOOGLE_TAG_MANAGER_URL = 'https://www.googletagmanager.com';
export const SENTRY_URL = 'https://www.sentry.io';
export const SCHEMA_ORG_URL = 'https://schema.org';
export const HCAPTCHA_URL = 'https://www.hcaptcha.com';
export const SUPABASE_STORAGE_URL = 'https://grwmzluuqyczatkxorfa.supabase.co';
export const HCAPTCHA_ASSETS_URL = 'https://newassets.hcaptcha.com';

// ============================================================================
// PERSONAL INFORMATION
// ============================================================================
export const FULL_NAME = 'Daniel Joffe';
export const JOB_TITLE = 'Senior Frontend Engineer';
export const EMAIL_ADDRESS = 'hello@danieljoffe.com';
export const LINKEDIN_PROFILE_URL = `${LINKEDIN_URL}/in/daniel-joffe-work`;
export const GITHUB_PROFILE_URL = `${GITHUB_URL}/danieljoffe`;
export const RESUME_URL = `${GOOGLE_DOCS_URL}/document/d/1v4IB1-XA_-h-wq5HLgzH8_dFzMbOm-PaqOwom8k5_i4/export?format=pdf&portrait=true`;
export const CALENDLY_URL = 'https://calendly.com/hello-danieljoffe/30min';
export const STORYBOOK_URL = 'https://ui.danieljoffe.com';
export const GITHUB_REPO_URL = 'https://github.com/danieljoffe/danieljoffe.com';

// ============================================================================
// SECURITY & CSP CONFIGURATION
// ============================================================================
export const allowedImageOrigins = [
  UNSPLASH_URL,
  UNSPLASH_PHOTOS_URL,
  GOOGLE_DOCS_URL,
  EXAMPLE_URL,
  GOOGLE_ANALYTICS_URL,
  GOOGLE_TAG_MANAGER_URL,
  SUPABASE_STORAGE_URL,
];

export const allowedOrigins = [
  ...allowedImageOrigins,
  DOMAIN_URL,
  SENTRY_URL,
  SCHEMA_ORG_URL,
  HCAPTCHA_URL,
];

// ============================================================================
// UI & ANIMATION CONSTANTS
// ============================================================================
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 1000,
} as const;

export const Z_INDEX = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
} as const;

// ============================================================================
// FORM & VALIDATION CONSTANTS
// ============================================================================
export const FORM_LIMITS = {
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 254,
  MESSAGE_MAX_LENGTH: 1000,
  RATE_LIMIT_REQUESTS: 5,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
} as const;

export const VALIDATION_PATTERNS = {
  NAME: /^[a-zA-Z\s\-']+$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// ============================================================================
// ACCESSIBILITY CONSTANTS
// ============================================================================
export const A11Y = {
  FOCUS_VISIBLE_CLASS: 'focus-visible',
  SKIP_LINK_TEXT: 'Skip to main content',
  LOADING_TEXT: 'Content is loading, please wait.',
  ERROR_TEXT: 'An error occurred. Please try again.',
} as const;

// ============================================================================
// NAVIGATION CONSTANTS
// ============================================================================
import { NavLink } from '@/types/base';

export const HOME_LINK: NavLink = { href: '/', label: 'Home' };
export const ABOUT_LINK: NavLink = { href: '/about', label: 'About' };
export const SERVICES_LINK: NavLink = { href: '/services', label: 'Services' };
export const PROJECTS_LINK: NavLink = { href: '/projects', label: 'Projects' };
export const EXPERIENCE_LINK: NavLink = {
  href: '/experience',
  label: 'Experience',
};
export const AUDIT_LINK: NavLink = { href: '/audit', label: 'Free Audit' };

export const NAV_LINKS: NavLink[] = [
  HOME_LINK,
  ABOUT_LINK,
  SERVICES_LINK,
  EXPERIENCE_LINK,
  PROJECTS_LINK,
];

// Form IDs
export const CONTACT_FORM_ID = 'contact-form';
