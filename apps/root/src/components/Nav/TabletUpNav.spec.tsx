import React from 'react';
import { render, screen } from '@testing-library/react';
import TabletUpNav from './TabletUpNav';

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
}));

jest.mock('next/link', () => {
  const MockLink = React.forwardRef(
    (
      props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string },
      ref: React.ForwardedRef<HTMLAnchorElement>
    ) => {
      const { href, children, ...rest } = props;
      return (
        <a ref={ref} href={href} {...rest}>
          {children}
        </a>
      );
    }
  );
  MockLink.displayName = 'MockLink';
  return MockLink;
});

jest.mock('./DarkModeToggle', () => {
  return function MockDarkModeToggle() {
    return <button data-testid='dark-mode-toggle'>Toggle</button>;
  };
});

jest.mock('./SearchTrigger', () => {
  return function MockSearchTrigger() {
    return <button data-testid='search-trigger'>Search</button>;
  };
});

jest.mock('./Logo', () => {
  return function MockLogo() {
    return <div data-testid='logo'>Logo</div>;
  };
});

jest.mock('@/lib/analytics', () => ({
  analytics: { navClick: jest.fn() },
}));

describe('TabletUpNav', () => {
  test('renders logo, primary links, More dropdown, Free Audit CTA, search, and theme toggle', () => {
    render(<TabletUpNav pathname='/' />);
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByText('Free Audit')).toBeInTheDocument();
    expect(screen.getByTestId('search-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
  });

  test('marks current page link with aria-current', () => {
    render(<TabletUpNav pathname='/services' />);
    expect(screen.getByText('Services')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(screen.getByText('Projects')).not.toHaveAttribute('aria-current');
  });

  test('is hidden on mobile via CSS class', () => {
    const { container } = render(<TabletUpNav pathname='/' />);
    expect(container.firstChild).toHaveClass('hidden', 'md:flex');
  });

  test('has primary navigation landmark', () => {
    render(<TabletUpNav pathname='/' />);
    expect(
      screen.getByRole('navigation', { name: /primary/i })
    ).toBeInTheDocument();
  });
});
