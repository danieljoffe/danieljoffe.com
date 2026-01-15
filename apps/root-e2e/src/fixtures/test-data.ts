// Navigation links for testing
export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/experience', label: 'Experience' },
  { href: '/projects', label: 'Projects' },
];

// Project slugs for parametrized tests (from apps/root/src/data/project.ts)
// These are the working project slugs that have matching MDX files.
//
// BUG: The following slugs are configured in project.ts but have MDX filename mismatches:
// - 'a11y-serials-case-study' → MDX file is 'accessibility-serials-study-case.mdx'
// - 'modern-practice-case-study' → MDX file is 'portfolio-modern-practice-study-case.mdx'
// - 'logistics-dashboard-case-study' → MDX file is 'logistics-dashboard-study-case.mdx'
// These routes return 500 errors. Either rename the MDX files or update project.ts slugs.
export const PROJECT_SLUGS = [
  'ui-components-v1',
  'performance-case-study',
  'component-library-case-study',
  'cms-tooling-case-study',
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
