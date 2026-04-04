import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from '@/state/Theme/ThemeProvider';
import DarkModeToggle from '../DarkModeToggle';

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
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
    });
  });

  test('renders three theme options as radio buttons', () => {
    render(<DarkModeToggle />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
  });

  test('renders radiogroup with Theme label', () => {
    render(<DarkModeToggle />);
    expect(
      screen.getByRole('radiogroup', { name: /theme/i })
    ).toBeInTheDocument();
  });

  test('renders light, dark, and system options with aria-labels', () => {
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
    expect(screen.getByLabelText('Switch to system mode')).toBeInTheDocument();
  });

  test('marks system as checked when theme is system', () => {
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to system mode')).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByLabelText('Switch to light mode')).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByLabelText('Switch to dark mode')).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });

  test('marks dark as checked when theme is dark', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to dark mode')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('marks light as checked when theme is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toHaveAttribute(
      'aria-checked',
      'true'
    );
  });

  test('clicking dark calls setTheme("dark") and analytics', async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByLabelText('Switch to dark mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
    expect(mockThemeToggle).toHaveBeenCalledWith('dark');
  });

  test('clicking light calls setTheme("light") and analytics', async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByLabelText('Switch to light mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
    expect(mockThemeToggle).toHaveBeenCalledWith('light');
  });

  test('clicking system calls setTheme("system") and analytics', async () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByLabelText('Switch to system mode'));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
    expect(mockThemeToggle).toHaveBeenCalledWith('system');
  });

  test('analytics is called before setTheme on click', async () => {
    const callOrder: string[] = [];
    mockThemeToggle.mockImplementation(() => callOrder.push('analytics'));
    mockSetTheme.mockImplementation(() => callOrder.push('setTheme'));

    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByLabelText('Switch to dark mode'));

    expect(callOrder).toEqual(['analytics', 'setTheme']);
  });

  test('each option has a title attribute', () => {
    render(<DarkModeToggle />);
    expect(screen.getByTitle('Light')).toBeInTheDocument();
    expect(screen.getByTitle('Dark')).toBeInTheDocument();
    expect(screen.getByTitle('System')).toBeInTheDocument();
  });

  test('each option contains an SVG icon', () => {
    render(<DarkModeToggle />);
    const radios = screen.getAllByRole('radio');
    radios.forEach(radio => {
      expect(radio.querySelector('svg')).toBeInTheDocument();
    });
  });
});
