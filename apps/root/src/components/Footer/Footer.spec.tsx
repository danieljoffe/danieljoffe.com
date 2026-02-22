import { render, screen } from '@testing-library/react';
import Footer from './index';

jest.mock('next/link', () => {
  const React = require('react');
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

jest.mock('@/lib/analytics', () => ({
  analytics: {
    navClick: jest.fn(),
    ctaClick: jest.fn(),
  },
}));

jest.mock('@/utils/helpers', () => ({
  downloadResume: jest.fn(),
  devLog: jest.fn(),
  isProduction: () => false,
}));

describe('Footer', () => {
  it('renders with contentinfo role', () => {
    render(<Footer />);
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders the profile name', () => {
    render(<Footer />);
    expect(screen.getByText('Daniel Joffe')).toBeInTheDocument();
  });

  it('renders footer navigation', () => {
    render(<Footer />);
    expect(
      screen.getByRole('navigation', { name: 'Footer navigation' })
    ).toBeInTheDocument();
  });

  it('renders the copyright notice with current year', () => {
    render(<Footer />);
    const year = new Date().getFullYear();
    expect(
      screen.getByText(new RegExp(`${year}.*Daniel Joffe`))
    ).toBeInTheDocument();
  });

  it('renders design system link', () => {
    render(<Footer />);
    expect(screen.getByText('ui.danieljoffe.com')).toBeInTheDocument();
  });
});
