import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from '@/state/Theme/ThemeProvider';
import DarkModeToggle from './DarkModeToggle';

const mockSetTheme = jest.fn();
const mockThemeToggle = jest.fn();

jest.mock('@/state/Theme/ThemeProvider', () => ({
  ...jest.requireActual('@/state/Theme/ThemeProvider'),
  useTheme: jest.fn(() => ({
    theme: 'system',
    setTheme: mockSetTheme,
  })),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: {
    themeToggle: (...args: unknown[]) => mockThemeToggle(...args),
  },
}));

const mockUseTheme = useTheme as jest.Mock;

describe('DarkModeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockThemeToggle.mockClear();
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
    });
  });

  it('renders three theme options', () => {
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to system mode')).toBeInTheDocument();
  });

  it('renders as a radiogroup with proper aria', () => {
    render(<DarkModeToggle />);
    expect(
      screen.getByRole('radiogroup', { name: 'Theme' })
    ).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  it('marks the current theme as checked', () => {
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to system mode')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByLabelText('Switch to light mode')).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  it('calls setTheme and analytics when clicking light', async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByLabelText('Switch to light mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
    expect(mockThemeToggle).toHaveBeenCalledWith('light');
  });

  it('calls setTheme and analytics when clicking dark', async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByLabelText('Switch to dark mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
    expect(mockThemeToggle).toHaveBeenCalledWith('dark');
  });

  it('highlights the active theme option', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
    });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to dark mode')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });
});
