import { render, screen } from '@testing-library/react';
import CTASection from './CTASection';

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

describe('CTASection', () => {
  const defaultProps = {
    headingId: 'test-cta',
    heading: 'Ready to start?',
    description: 'Get in touch today.',
    buttons: [{ label: 'Contact', href: '/about', ariaLabel: 'Contact me' }],
  };

  it('renders heading and description', () => {
    render(<CTASection {...defaultProps} />);
    expect(
      screen.getByRole('heading', { name: 'Ready to start?' })
    ).toBeInTheDocument();
    expect(screen.getByText('Get in touch today.')).toBeInTheDocument();
  });

  it('renders a single button when one is provided', () => {
    render(<CTASection {...defaultProps} />);
    expect(screen.getByRole('link', { name: 'Contact me' })).toHaveAttribute(
      'href',
      '/about'
    );
  });

  it('renders multiple buttons when more than one is provided', () => {
    const props = {
      ...defaultProps,
      buttons: [
        { label: 'Contact', href: '/about', ariaLabel: 'Contact me' },
        { label: 'Projects', href: '/projects', ariaLabel: 'View projects' },
      ],
    };
    render(<CTASection {...props} />);
    expect(
      screen.getByRole('link', { name: 'Contact me' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View projects' })
    ).toBeInTheDocument();
  });

  it('sets the heading id for aria-labelledby', () => {
    render(<CTASection {...defaultProps} />);
    const heading = screen.getByRole('heading', { name: 'Ready to start?' });
    expect(heading).toHaveAttribute('id', 'test-cta');
  });

  it('renders button with target when provided', () => {
    const props = {
      ...defaultProps,
      buttons: [
        {
          label: 'External',
          href: 'https://example.com',
          ariaLabel: 'External link',
          target: '_blank',
        },
      ],
    };
    render(<CTASection {...props} />);
    expect(screen.getByRole('link', { name: 'External link' })).toHaveAttribute(
      'target',
      '_blank'
    );
  });
});
