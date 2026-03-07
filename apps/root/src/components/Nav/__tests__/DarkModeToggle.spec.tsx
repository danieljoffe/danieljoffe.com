import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useTheme } from '@/state/Theme/Provider';
import { analytics } from '@/lib/analytics';
import DarkModeToggle from '../DarkModeToggle';

const mockToggleDarkMode = jest.fn();

jest.mock('@/state/Theme/Provider', () => ({
  useTheme: jest.fn(() => ({
    isDarkMode: false,
    toggleDarkMode: mockToggleDarkMode,
  })),
}));

jest.mock('@/lib/analytics', () => ({
  analytics: { themeToggle: jest.fn() },
}));

const mockUseGlobal = useTheme as jest.Mock;

describe('DarkModeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when isDarkMode is false (light mode)', () => {
    beforeEach(() => {
      mockUseGlobal.mockReturnValue({
        isDarkMode: false,
        toggleDarkMode: mockToggleDarkMode,
      });
    });

    test('renders Moon icon', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button', {
        name: /switch to dark mode/i,
      });
      expect(button).toBeInTheDocument();
      // Moon icon should be rendered (not Sun)
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    test('has aria-label "Switch to dark mode"', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    test('has title "Switch to dark mode"', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch to dark mode');
    });

    test('clicking calls analytics.themeToggle with "dark"', async () => {
      const user = userEvent.setup();
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      await user.click(button);
      expect(analytics.themeToggle).toHaveBeenCalledWith('dark');
    });

    test('clicking calls toggleDarkMode', async () => {
      const user = userEvent.setup();
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      await user.click(button);
      expect(mockToggleDarkMode).toHaveBeenCalledTimes(1);
    });
  });

  describe('when isDarkMode is true (dark mode)', () => {
    beforeEach(() => {
      mockUseGlobal.mockReturnValue({
        isDarkMode: true,
        toggleDarkMode: mockToggleDarkMode,
      });
    });

    test('renders Sun icon', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button', {
        name: /switch to light mode/i,
      });
      expect(button).toBeInTheDocument();
      expect(button.querySelector('svg')).toBeInTheDocument();
    });

    test('has aria-label "Switch to light mode"', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    test('has title "Switch to light mode"', () => {
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('title', 'Switch to light mode');
    });

    test('clicking calls analytics.themeToggle with "light"', async () => {
      const user = userEvent.setup();
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      await user.click(button);
      expect(analytics.themeToggle).toHaveBeenCalledWith('light');
    });

    test('clicking calls toggleDarkMode', async () => {
      const user = userEvent.setup();
      render(<DarkModeToggle />);
      const button = screen.getByRole('button');
      await user.click(button);
      expect(mockToggleDarkMode).toHaveBeenCalledTimes(1);
    });
  });

  test('has name attribute "toggle-dark-mode"', () => {
    render(<DarkModeToggle />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('name', 'toggle-dark-mode');
  });

  test('analytics is called before toggleDarkMode on click', async () => {
    const callOrder: string[] = [];
    (analytics.themeToggle as jest.Mock).mockImplementation(() => {
      callOrder.push('analytics');
    });
    mockToggleDarkMode.mockImplementation(() => {
      callOrder.push('toggle');
    });

    const user = userEvent.setup();
    render(<DarkModeToggle />);
    const button = screen.getByRole('button');
    await user.click(button);

    expect(callOrder).toEqual(['analytics', 'toggle']);
  });
});
