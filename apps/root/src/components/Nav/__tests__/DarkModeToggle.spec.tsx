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

  test('renders a single button', () => {
    render(<DarkModeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('button has accessible label with current theme', () => {
    render(<DarkModeToggle />);
    expect(screen.getByLabelText(/theme: system mode/i)).toBeInTheDocument();
  });

  test('shows light mode label when theme is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText(/theme: light mode/i)).toBeInTheDocument();
  });

  test('shows dark mode label when theme is dark', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText(/theme: dark mode/i)).toBeInTheDocument();
  });

  test('cycles from system to light on click', async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');
    expect(mockThemeToggle).toHaveBeenCalledWith('light');
  });

  test('cycles from light to dark on click', async () => {
    mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme });
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
    expect(mockThemeToggle).toHaveBeenCalledWith('dark');
  });

  test('cycles from dark to system on click', async () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
    expect(mockThemeToggle).toHaveBeenCalledWith('system');
  });

  test('analytics is called before setTheme on click', async () => {
    const callOrder: string[] = [];
    mockThemeToggle.mockImplementation(() => callOrder.push('analytics'));
    mockSetTheme.mockImplementation(() => callOrder.push('setTheme'));

    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));

    expect(callOrder).toEqual(['analytics', 'setTheme']);
  });

  test('button contains an SVG icon', () => {
    render(<DarkModeToggle />);
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  test('button has title with cycle hint', () => {
    render(<DarkModeToggle />);
    expect(
      screen.getByTitle(/system mode.*press d to cycle/i)
    ).toBeInTheDocument();
  });
});
