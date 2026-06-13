// Primary navigation links — always visible in nav bar
export const PRIMARY_NAV_LINKS = [
  { href: '/projects', label: 'Projects' },
  { href: '/experience', label: 'Experience' },
  { href: '/about', label: 'About' },
];

// Project slugs for parametrized tests (from apps/root/src/data/project.ts)
export const PROJECT_SLUGS = [
  'ui-components-v1',
  'ui-components-v2',
  'performance-case-study',
  'component-library-case-study',
  'cms-tooling-case-study',
  'accessibility-serials-study-case',
  'portfolio-modern-practice-study-case',
  'logistics-dashboard-study-case',
];

// Experience slugs for parametrized tests (from apps/root/src/data/experience.ts)
export const EXPERIENCE_SLUGS = [
  'winc',
  'internet-brands',
  'the-library-corporation',
  'fightcamp',
  'professional-development',
];

// Valid form data for contact form tests
export const VALID_FORM_DATA = {
  name: 'John Doe Test User',
  email: 'test@example.com',
  message:
    'This is a test message that meets the minimum length requirement for the contact form validation. It contains enough characters to pass validation.',
};

// Invalid form data for testing validation
export const INVALID_FORM_DATA = {
  shortName: 'Jo',
  invalidEmail: 'not-an-email',
  shortMessage: 'Too short',
  messageWithUrl:
    'Check out https://example.com for more info about this topic.',
};

// Audit page test data
export const VALID_AUDIT_URL = 'example.com';
