import Button from '@/components/units/Button';

export type NavLink = {
  href: string;
  label: string;
};

export const HOME_LINK: NavLink = { href: '/', label: 'Home' };
export const ABOUT_LINK: NavLink = { href: '/about', label: 'About' };
export const PROJECTS_LINK: NavLink = { href: '/projects', label: 'Projects' };
export const EXPERIENCE_LINK: NavLink = {
  href: '/experience',
  label: 'Experience',
};

export const NAV_LINKS: NavLink[] = [HOME_LINK, ABOUT_LINK, PROJECTS_LINK];

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
