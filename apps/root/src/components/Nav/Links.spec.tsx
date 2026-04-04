import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ABOUT_LINK,
  EXPERIENCE_LINK,
  HOME_LINK,
  NAV_LINKS,
  PROJECTS_LINK,
} from '@/utils/constants';
import NavLinks from './Links';

const mockPush = jest.fn();

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
}));

// Mock next/link
jest.mock('next/link', () => {
  const React = require('react');
  const MockLink = React.forwardRef(
    (
      props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string },
      ref: React.ForwardedRef<HTMLAnchorElement>
    ) => {
      const { href, children, onClick, ...rest } = props;
      return (
        <a
          ref={ref}
          href={href}
          onClick={e => {
            e.preventDefault();
            onClick?.(e);
          }}
          {...rest}
        >
          {children}
        </a>
      );
    }
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

describe('NavLinks', () => {
  test('renders all navigation links', () => {
    render(<NavLinks pathname='/' />);
    expect(
      screen.getByRole('menuitem', { name: /navigate to home page/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /navigate to about page/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /navigate to experience page/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: /navigate to projects page/i })
    ).toBeInTheDocument();
  });

  test('renders menubar with proper role', () => {
    render(<NavLinks pathname='/' />);
    expect(screen.getByRole('menubar')).toBeInTheDocument();
  });

  test('renders list items with role none for proper menu semantics', () => {
    render(<NavLinks pathname='/' />);
    const listItems = screen.getAllByRole('none');
    expect(listItems).toHaveLength(NAV_LINKS.length);
  });

  test('highlights current page link with aria-current', () => {
    render(<NavLinks pathname='/' />);
    const homeLink = screen.getByRole('menuitem', {
      name: /navigate to home page/i,
    });
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  test('does not set aria-current on non-current pages', () => {
    render(<NavLinks pathname='/' />);
    const aboutLink = screen.getByRole('menuitem', {
      name: /navigate to about page/i,
    });
    expect(aboutLink).not.toHaveAttribute('aria-current');
  });

  test('correctly identifies About page as current', () => {
    render(<NavLinks pathname='/about' />);
    const aboutLink = screen.getByRole('menuitem', {
      name: /navigate to about page/i,
    });
    expect(aboutLink).toHaveAttribute('aria-current', 'page');
  });

  test('correctly identifies Projects page as current', () => {
    render(<NavLinks pathname='/projects' />);
    const projectsLink = screen.getByRole('menuitem', {
      name: /navigate to projects page/i,
    });
    expect(projectsLink).toHaveAttribute('aria-current', 'page');
  });

  test('calls handleClick and router.push immediately on link click in mobile context', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    mockPush.mockReset();

    render(<NavLinks pathname='/' handleClick={handleClick} />);
    const aboutLink = screen.getByRole('menuitem', {
      name: /navigate to about page/i,
    });

    await user.click(aboutLink);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/about');
  });

  test('renders links with correct href values', () => {
    render(<NavLinks pathname='/' />);
    expect(
      screen.getByRole('menuitem', { name: /navigate to home page/i })
    ).toHaveAttribute('href', HOME_LINK.href);
    expect(
      screen.getByRole('menuitem', { name: /navigate to about page/i })
    ).toHaveAttribute('href', ABOUT_LINK.href);
    expect(
      screen.getByRole('menuitem', { name: /navigate to experience page/i })
    ).toHaveAttribute('href', EXPERIENCE_LINK.href);
    expect(
      screen.getByRole('menuitem', { name: /navigate to projects page/i })
    ).toHaveAttribute('href', PROJECTS_LINK.href);
  });

  test('exports NAV_LINKS array with all links', () => {
    expect(NAV_LINKS).toContainEqual(HOME_LINK);
    expect(NAV_LINKS).toContainEqual(ABOUT_LINK);
    expect(NAV_LINKS).toContainEqual(PROJECTS_LINK);
    expect(NAV_LINKS).toContainEqual(EXPERIENCE_LINK);
  });

  test('renders without handleClick prop', () => {
    render(<NavLinks pathname='/' />);
    expect(screen.getByRole('menubar')).toBeInTheDocument();
  });

  test('renders links with text content', () => {
    render(<NavLinks pathname='/' />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });
});
