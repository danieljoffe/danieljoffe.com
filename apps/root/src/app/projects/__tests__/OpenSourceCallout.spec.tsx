import React from 'react';
import { render, screen } from '@testing-library/react';
import OpenSourceCallout from '../OpenSourceCallout';

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

describe('OpenSourceCallout', () => {
  it('renders heading text about open source', () => {
    render(<OpenSourceCallout />);
    expect(
      screen.getByText(/this portfolio is open source/i)
    ).toBeInTheDocument();
  });

  it('renders GitHub link with correct href and accessible label', () => {
    render(<OpenSourceCallout />);
    const link = screen.getByRole('link', {
      name: /view source code on github/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      'href',
      'https://github.com/danieljoffe/danieljoffe.com'
    );
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders GitHub button text', () => {
    render(<OpenSourceCallout />);
    expect(screen.getByText('View Source')).toBeInTheDocument();
  });

  it('renders Storybook link with correct href and accessible label', () => {
    render(<OpenSourceCallout />);
    const link = screen.getByRole('link', {
      name: /browse ui component library on storybook/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://ui.danieljoffe.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders Component Library button text', () => {
    render(<OpenSourceCallout />);
    expect(screen.getByText('Component Library')).toBeInTheDocument();
  });
});
