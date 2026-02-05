import { NavLinkI } from '@/types/base';

export const HOME_LINK: NavLinkI = { href: '/', label: 'Home' };
export const ABOUT_LINK: NavLinkI = { href: '/about', label: 'About' };
export const SERVICES_LINK: NavLinkI = { href: '/services', label: 'Services' };
export const PROJECTS_LINK: NavLinkI = { href: '/projects', label: 'Projects' };
export const EXPERIENCE_LINK: NavLinkI = {
  href: '/experience',
  label: 'Experience',
};

export const NAV_LINKS: NavLinkI[] = [
  HOME_LINK,
  ABOUT_LINK,
  SERVICES_LINK,
  EXPERIENCE_LINK,
  PROJECTS_LINK,
];

// Form IDs
export const CONTACT_FORM_ID = 'contact-form';
