// ============================================================================
// ENCODING & CRYPTOGRAPHY
// ============================================================================
export const KEYS_STR =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

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

// ============================================================================
// PERSONAL INFORMATION
// ============================================================================
export const FULL_NAME = 'Daniel Joffe';
export const JOB_TITLE = 'Senior Frontend Engineer';
export const EMAIL_ADDRESS = 'hello@danieljoffe.com';
export const LINKEDIN_PROFILE_URL = `${LINKEDIN_URL}/in/daniel-joffe-work`;
export const GITHUB_PROFILE_URL = `${GITHUB_URL}/dannyk08`;
export const RESUME_URL = `${GOOGLE_DOCS_URL}/document/d/1v4IB1-XA_-h-wq5HLgzH8_dFzMbOm-PaqOwom8k5_i4/export?format=pdf&portrait=true`;

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

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
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
// PERFORMANCE CONSTANTS
// ============================================================================
export const PERFORMANCE = {
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 100,
  LAZY_LOAD_THRESHOLD: 100,
  CACHE_TTL: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 hours
  },
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
