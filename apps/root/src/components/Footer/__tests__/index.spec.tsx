import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Footer from '../index';

expect.extend(toHaveNoViolations);

// Mock next/link to render a real <a>
jest.mock('next/link', () => {
  return function MockLink(
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      href: string;
      ref?: React.Ref<HTMLAnchorElement>;
    }
  ) {
    const { href, children, ref, ...rest } = props;
    return (
      <a ref={ref} href={href} {...rest}>
        {children}
      </a>
    );
  };
});

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
    expect(screen.getByText('Full-Stack Engineer')).toBeInTheDocument();
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

  it('renders the Storybook design system link with shared-ui attribution', () => {
    render(<Footer />);
    const link = screen.getByRole('link', {
      name: /built with my own ui library.*@danieljoffe\/shared-ui/i,
    });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://ui.danieljoffe.com');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('renders the shared-ui attribution text', () => {
    render(<Footer />);
    expect(
      screen.getByText('Built with my own UI library')
    ).toBeInTheDocument();
    expect(screen.getByText('@danieljoffe/shared-ui')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Footer />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
