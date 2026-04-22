import { render, screen, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeProvider';

const mockMatchMedia = (prefersDark: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockReturnValue({
      matches: prefersDark,
      addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
        // listener registration stub
        void fn;
      },
      removeEventListener: (
        _: string,
        fn: (e: { matches: boolean }) => void
      ) => {
        void fn;
      },
    }),
  });
};

function ThemeDisplay() {
  const { theme, resolvedTheme, isDarkMode, setTheme, toggleDarkMode } =
    useTheme();
  return (
    <div>
      <span data-testid='theme'>{theme}</span>
      <span data-testid='resolved'>{resolvedTheme}</span>
      <span data-testid='dark'>{isDarkMode ? 'yes' : 'no'}</span>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
      <button onClick={() => setTheme('light')}>Set Light</button>
      <button onClick={toggleDarkMode}>Toggle</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('ThemeProvider', () => {
  it('provides default theme as system', () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('system');
  });

  it('resolves to light when system prefers light', async () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    // Wait for queueMicrotask
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    expect(screen.getByTestId('dark')).toHaveTextContent('no');
  });

  it('resolves to dark when system prefers dark', async () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    expect(screen.getByTestId('dark')).toHaveTextContent('yes');
  });

  it('reads stored theme from localStorage', async () => {
    localStorage.setItem('theme', 'dark');
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    expect(screen.getByTestId('dark')).toHaveTextContent('yes');
  });

  it('persists theme to localStorage when setTheme is called', async () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      screen.getByText('Set Dark').click();
    });
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('toggles dark mode', async () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      await new Promise(r => setTimeout(r, 0));
    });
    await act(async () => {
      screen.getByText('Toggle').click();
    });
    expect(screen.getByTestId('dark')).toHaveTextContent('yes');
  });

  it('adds dark class to documentElement when dark', async () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      screen.getByText('Set Dark').click();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class when light', async () => {
    document.documentElement.classList.add('dark');
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <ThemeDisplay />
      </ThemeProvider>
    );
    await act(async () => {
      screen.getByText('Set Light').click();
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
