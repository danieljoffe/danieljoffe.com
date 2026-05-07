import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { NavLink } from '@/types/base';
import BreadCrumbs from './BreadCrumbs';

expect.extend(toHaveNoViolations);

// Mock next/navigation
const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// Mock next/link to use a real anchor and prevent navigation
jest.mock('next/link', () => {
  return function MockLink(
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
      ref?: React.Ref<HTMLAnchorElement>;
    }
  ) {
    const { href, children, onClick, ref, ...rest } = props;
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
  };
});

describe('BreadCrumbs', () => {
  const items: NavLink[] = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/about/team', label: 'Team' },
  ];

  test('renders nav with breadcrumb semantics and non-current items as links', () => {
    mockUsePathname.mockReturnValue('/about');
    render(<BreadCrumbs items={items} />);
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(nav).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    // Current page (/about) is rendered as text, not a link
    expect(links).toHaveLength(items.length - 1);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[1]).toHaveAttribute('href', '/about/team');
  });

  test('marks current page item with aria-current as text element', () => {
    mockUsePathname.mockReturnValue('/about/team');
    render(<BreadCrumbs items={items} />);
    // Current page is rendered as a paragraph, not a link
    const current = screen.getByText(/team/i);
    expect(current).toHaveAttribute('aria-current', 'page');
    expect(current.tagName).toBe('P');
    // Non-current items are still links
    const nonCurrent = screen.getByRole('link', { name: /about/i });
    expect(nonCurrent).not.toHaveAttribute('aria-current');
  });

  test('returns null when items is null', () => {
    const { container } = render(
      <BreadCrumbs items={null as unknown as NavLink[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  test('has no accessibility violations', async () => {
    mockUsePathname.mockReturnValue('/about');
    const { container } = render(<BreadCrumbs items={items} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
