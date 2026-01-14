import { NavLinkI } from '@/types/base';
import Button from '@/components/Button';

export const HOME_LINK: NavLinkI = { href: '/', label: 'Home' };
export const ABOUT_LINK: NavLinkI = { href: '/about', label: 'About' };
export const PROJECTS_LINK: NavLinkI = { href: '/projects', label: 'Projects' };
export const EXPERIENCE_LINK: NavLinkI = {
  href: '/experience',
  label: 'Experience',
};

export const NAV_LINKS: NavLinkI[] = [
  HOME_LINK,
  ABOUT_LINK,
  EXPERIENCE_LINK,
  PROJECTS_LINK,
];

export default function NavLinks({
  pathname,
  handleClick,
}: {
  pathname: string;
  handleClick?: () => void;
}) {
  const handleLinkClick = () => {
    setTimeout(() => {
      handleClick?.();
    }, 150);
  };

  return (
    <div className='flex flex-col h-full w-full justify-center items-center'>
      <ul
        className='flex flex-col gap-4 items-center md:flex-row'
        role='menubar'
      >
        {NAV_LINKS.map(link => (
          <li key={link.href} className='flex items-center' role='none'>
            <Button
              variant='link'
              size='sm'
              as='link'
              href={link.href}
              onClick={handleLinkClick}
              highlighted={pathname === link.href}
              role='menuitem'
              aria-current={pathname === link.href ? 'page' : undefined}
              aria-label={`Navigate to ${link.label} page`}
            >
              {link.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
