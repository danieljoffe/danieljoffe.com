import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import TabletUpNav from './TabletUpNav';

expect.extend(toHaveNoViolations);

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, prefetch: jest.fn() }),
}));

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

jest.mock('next/image', () => {
  return function MockImage(props: React.ImgHTMLAttributes<HTMLImageElement>) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  };
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

// analytics.navClick is imported by TabletUpNav but not exercised in these
// render-only tests. The mock prevents the real module from loading.
jest.mock('@/lib/analytics', () => ({
  analytics: { navClick: jest.fn() },
}));

describe('TabletUpNav', () => {
  test('renders logo, primary links, More dropdown, search, and theme toggle', () => {
    render(<TabletUpNav pathname='/' />);
    expect(screen.getByAltText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Experience')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.queryByText('Free Audit')).not.toBeInTheDocument();
    expect(screen.getByTestId('search-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('dark-mode-toggle')).toBeInTheDocument();
  });

  test('exposes external links in the More dropdown as new-tab anchors', () => {
    render(<TabletUpNav pathname='/' />);
    fireEvent.click(screen.getByText('More'));

    const wyrdfold = screen.getByRole('menuitem', { name: /Wyrdfold/i });
    expect(wyrdfold).toHaveAttribute('href', 'https://wyrdfold.com');
    expect(wyrdfold).toHaveAttribute('target', '_blank');
    expect(wyrdfold).toHaveAttribute('rel', 'noopener noreferrer');

    const sharedUi = screen.getByRole('menuitem', { name: /Shared UI/i });
    expect(sharedUi).toHaveAttribute('href', 'https://ui.danieljoffe.com');
    expect(sharedUi).toHaveAttribute('target', '_blank');
  });

  test('marks current page link with aria-current', () => {
    render(<TabletUpNav pathname='/experience' />);
    expect(screen.getByText('Experience')).toHaveAttribute(
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

  it('has no accessibility violations', async () => {
    const { container } = render(<TabletUpNav pathname='/' />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
