import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../index';

// Mock next/link to render a real <a>
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
    ctaClick: jest.fn(),
    navClick: jest.fn(),
  },
}));

jest.mock('@/utils/helpers', () => ({
  downloadResume: jest.fn(),
  devLog: jest.fn(),
}));

describe('Footer', () => {
  it('renders with contentinfo role', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveAttribute('aria-label', 'Site footer');
  });

  it('displays profile name', () => {
    render(<Footer />);
    expect(screen.getByText('Daniel Joffe')).toBeInTheDocument();
  });

  it('displays profile title', () => {
    render(<Footer />);
    expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
  });

  it('displays current year in copyright', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    const copyright = screen.getByText(
      new RegExp(`${currentYear}.*Daniel Joffe`)
    );
    expect(copyright).toBeInTheDocument();
    expect(copyright).toHaveTextContent('All rights reserved');
  });

  it('has footer navigation section', () => {
    render(<Footer />);
    const nav = screen.getByRole('navigation', { name: /footer navigation/i });
    expect(nav).toBeInTheDocument();
  });

  it('renders the Storybook design system link', () => {
    render(<Footer />);
    const link = screen.getByRole('link', {
      name: /browse the design system.*ui\.danieljoffe\.com/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://ui.danieljoffe.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the design system link text', () => {
    render(<Footer />);
    expect(screen.getByText('Browse the design system')).toBeInTheDocument();
    expect(screen.getByText('ui.danieljoffe.com')).toBeInTheDocument();
  });
});
