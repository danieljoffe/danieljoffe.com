import React from 'react';
import { render, screen } from '@testing-library/react';
import Logo from './Logo';
import { FULL_NAME, JOB_TITLE } from '@/utils/constants';
import { HOME_LINK } from '@/utils/base';

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

// Mock next/image
jest.mock('next/image', () => {
  const MockImage = (props: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    priority?: boolean;
    loading?: string;
  }) => {
    return (
      <img
        src={props.src}
        alt={props.alt}
        width={props.width}
        height={props.height}
        className={props.className}
        data-priority={props.priority}
        loading={props.loading}
      />
    );
  };
  return MockImage;
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

  test('renders logo image', () => {
    render(<Logo />);
    const image = screen.getByRole('img');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/icon-w-name.svg');
  });

  test('logo image has descriptive alt text', () => {
    render(<Logo />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt', `${FULL_NAME} - ${JOB_TITLE}`);
  });

  test('logo image has proper dimensions', () => {
    render(<Logo />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('width', '124');
    expect(image).toHaveAttribute('height', '24');
  });

  test('logo image is prioritized for loading', () => {
    render(<Logo />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('data-priority', 'true');
  });

  test('logo image uses eager loading', () => {
    render(<Logo />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('loading', 'eager');
  });

  test('logo image has responsive height classes', () => {
    render(<Logo />);
    const image = screen.getByRole('img');
    expect(image.className).toContain('h-6');
    expect(image.className).toContain('sm:h-7');
    expect(image.className).toContain('md:h-8');
  });
});
