import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from '@danieljoffe.com/shared-ui';
import DarkModeToggle from './DarkModeToggle';

const mockToggleDarkMode = jest.fn();
const mockThemeToggle = jest.fn();

jest.mock('@danieljoffe.com/shared-ui', () => ({
  ...jest.requireActual('@danieljoffe.com/shared-ui'),
  useTheme: jest.fn(() => ({
    isDarkMode: false,
    toggleDarkMode: mockToggleDarkMode,
  })),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    themeToggle: (...args: unknown[]) => mockThemeToggle(...args),
  },
}));

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

const mockUseTheme = useTheme as jest.Mock;

describe('DarkModeToggle', () => {
  beforeEach(() => {
    mockToggleDarkMode.mockClear();
    mockThemeToggle.mockClear();
    mockUseTheme.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });
  });

  it('renders with correct aria-label for light mode', () => {
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
  });

  it('renders with correct aria-label for dark mode', () => {
    mockUseTheme.mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
  });

  it('calls toggleDarkMode and analytics on click', async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockThemeToggle).toHaveBeenCalledWith('dark');
    expect(mockToggleDarkMode).toHaveBeenCalled();
  });

  it('tracks light mode when toggling from dark', async () => {
    mockUseTheme.mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockThemeToggle).toHaveBeenCalledWith('light');
  });
});
