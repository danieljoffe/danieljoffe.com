import React from 'react';
import { render, screen } from '@testing-library/react';
import { HOME_LINK } from '@/utils/constants';
import Logo from './Logo';

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

describe('Logo', () => {
  test('renders as a link to home page', () => {
    render(<Logo />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', HOME_LINK.href);
  });

  test('has accessible label for home navigation', () => {
    render(<Logo />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('aria-label', HOME_LINK.label);
  });

  test('renders SVG logo', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('SVG logo has proper dimensions', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '124');
    expect(svg).toHaveAttribute('height', '24');
  });

  test('SVG logo has viewBox for scaling', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox');
  });
});
