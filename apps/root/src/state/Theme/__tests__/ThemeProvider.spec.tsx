import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';

let mockMatchesState = false;
const mockListeners: Array<(e: { matches: boolean }) => void> = [];

const mockMatchMedia = jest.fn().mockImplementation(() => ({
  matches: mockMatchesState,
  addEventListener: jest.fn((_, handler) => mockListeners.push(handler)),
  removeEventListener: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
});

function TestConsumer() {
  const { theme, resolvedTheme, isDarkMode, setTheme, toggleDarkMode } =
    useTheme();
  return (
    <div>
      <span data-testid='theme'>{theme}</span>
      <span data-testid='resolved'>{resolvedTheme}</span>
      <span data-testid='dark'>{String(isDarkMode)}</span>
      <button name='light' onClick={() => setTheme('light')}>
        Light
      </button>
      <button name='dark' onClick={() => setTheme('dark')}>
        Dark
      </button>
      <button name='system' onClick={() => setTheme('system')}>
        System
      </button>
      <button name='toggle' onClick={toggleDarkMode}>
        Toggle
      </button>
    </div>
  );
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMatchesState = false;
    mockListeners.length = 0;
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to system theme', async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    // After microtask, loads stored theme
    await act(() => Promise.resolve());
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('sets theme and persists to localStorage', async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await act(() => Promise.resolve());
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('dark')).toHaveTextContent('true');
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles dark mode', async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await act(() => Promise.resolve());

    // Default is light (system with no dark preference)
    expect(screen.getByTestId('dark')).toHaveTextContent('false');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('dark')).toHaveTextContent('true');
  });

  it('adds dark class to documentElement when dark mode', async () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await act(() => Promise.resolve());
    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads stored theme from localStorage', async () => {
    localStorage.setItem('theme', 'dark');

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await act(() => Promise.resolve());
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('resolves system theme based on media query', async () => {
    mockMatchesState = true;

    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>
    );

    await act(() => Promise.resolve());
    expect(screen.getByTestId('dark')).toHaveTextContent('true');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });
});
