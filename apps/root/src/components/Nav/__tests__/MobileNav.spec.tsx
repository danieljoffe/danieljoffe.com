import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import MobileNav from '../MobileNav';

expect.extend(toHaveNoViolations);

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

// analytics is imported by MobileNav; mocks prevent the real module from loading.
// formStart is not exercised by these tests but is called in code paths that
// import the module, so it must remain mocked to avoid runtime errors.
jest.mock('@/lib/analytics', () => ({
  analytics: {
    mobileMenuToggle: jest.fn(),
    navClick: jest.fn(),
    formStart: jest.fn(),
  },
}));

jest.mock('@/utils/constants', () => ({
  HOME_LINK: { href: '/', label: 'Home' },
  PRIMARY_NAV_LINKS: [
    { href: '/services', label: 'Services' },
    { href: '/projects', label: 'Projects' },
  ],
  MORE_NAV_LINKS: [
    { href: '/about', label: 'About' },
    { href: '/blog', label: 'Blog' },
  ],
  AUDIT_LINK: { href: '/audit', label: 'Audit' },
}));

jest.mock('../DarkModeToggle', () => {
  return function MockDarkModeToggle() {
    return <button name='dark-mode'>Dark</button>;
  };
});

describe('MobileNav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the bottom nav with home and primary links', () => {
    render(<MobileNav pathname='/' />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Services')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  it('renders search and more buttons', () => {
    render(<MobileNav pathname='/' />);

    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /open more menu/i })
    ).toBeInTheDocument();
  });

  it('highlights home link when on home page', () => {
    render(<MobileNav pathname='/' />);

    const homeLink = screen.getByRole('link', { name: 'Home' });
    expect(homeLink).toHaveAttribute('aria-current', 'page');
  });

  it('opens more sheet when More button is clicked', () => {
    render(<MobileNav pathname='/' />);

    fireEvent.click(screen.getByRole('button', { name: /open more menu/i }));

    expect(
      screen.getByRole('dialog', { name: /more navigation/i })
    ).not.toHaveAttribute('aria-hidden', 'true');
  });

  it('shows more sheet links (About, Blog, Audit)', () => {
    render(<MobileNav pathname='/' />);

    fireEvent.click(screen.getByRole('button', { name: /open more menu/i }));

    // Sheet links render as buttons with link labels
    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
  });

  it('closes sheet on Escape key', () => {
    render(<MobileNav pathname='/' />);

    fireEvent.click(screen.getByRole('button', { name: /open more menu/i }));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(
      screen.getByRole('button', { name: /open more menu/i })
    ).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MobileNav pathname='/' />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
