'use client';

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  isDarkMode: false,
  setTheme: () => undefined,
  toggleDarkMode: () => undefined,
});

export function useTheme(): ThemeContextType {
  return useContext(ThemeContext);
}

const THEME_STORAGE_KEY = 'theme';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, _setTheme] = useState<Theme>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      _setTheme(getStoredTheme());
      setSystemPrefersDark(getSystemPrefersDark());
    });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDarkMode = useMemo(() => {
    if (theme === 'system') return systemPrefersDark;
    return theme === 'dark';
  }, [theme, systemPrefersDark]);

  const resolvedTheme: 'light' | 'dark' = isDarkMode ? 'dark' : 'light';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  const setTheme = useCallback((mode: Theme) => {
    _setTheme(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const toggleDarkMode = useCallback(() => {
    const newMode = isDarkMode ? 'light' : 'dark';
    setTheme(newMode);
  }, [isDarkMode, setTheme]);

  const value = useMemo(
    () => ({ theme, resolvedTheme, isDarkMode, setTheme, toggleDarkMode }),
    [theme, resolvedTheme, isDarkMode, setTheme, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
