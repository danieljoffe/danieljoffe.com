import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { useTheme } from '@/state/Theme/ThemeProvider';
import DarkModeToggle from '../DarkModeToggle';

expect.extend(toHaveNoViolations);

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

  test('shows correct aria-label for next theme when current is system', () => {
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument();
  });

  test('shows correct aria-label for next theme when current is light', () => {
    mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument();
  });

  test('shows correct aria-label for next theme when current is dark', () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });
    render(<DarkModeToggle />);
    expect(screen.getByLabelText('Switch to system mode')).toBeInTheDocument();
  });

  test('clicking cycles from system to light', async () => {
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockThemeToggle).toHaveBeenCalledWith('light');
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  test('clicking cycles from light to dark', async () => {
    mockUseTheme.mockReturnValue({ theme: 'light', setTheme: mockSetTheme });
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockThemeToggle).toHaveBeenCalledWith('dark');
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  test('clicking cycles from dark to system', async () => {
    mockUseTheme.mockReturnValue({ theme: 'dark', setTheme: mockSetTheme });
    const user = userEvent.setup();
    render(<DarkModeToggle />);
    await user.click(screen.getByRole('button'));
    expect(mockThemeToggle).toHaveBeenCalledWith('system');
    expect(mockSetTheme).toHaveBeenCalledWith('system');
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

  test('has a title showing current theme', () => {
    render(<DarkModeToggle />);
    expect(screen.getByTitle('Theme: system')).toBeInTheDocument();
  });

  test('contains an SVG icon', () => {
    render(<DarkModeToggle />);
    expect(screen.getByRole('button').querySelector('svg')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DarkModeToggle />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
