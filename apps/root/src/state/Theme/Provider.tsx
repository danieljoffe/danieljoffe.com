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

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: 'system',
  isDarkMode: false,
  setThemeMode: () => undefined,
  toggleDarkMode: () => undefined,
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

const THEME_STORAGE_KEY = 'theme-mode';

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  // Initialize with server-safe defaults to prevent hydration mismatch.
  // A blocking <script> in Head.tsx applies the correct `dark` class before
  // paint, so the visual theme is correct even before this state syncs.
  const [themeMode, _setThemeMode] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Sync theme state from localStorage/system preference after mount.
  useEffect(() => {
    queueMicrotask(() => {
      _setThemeMode(getStoredThemeMode());
      setSystemPrefersDark(getSystemPrefersDark());
    });
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDarkMode = useMemo(() => {
    if (themeMode === 'system') return systemPrefersDark;
    return themeMode === 'dark';
  }, [themeMode, systemPrefersDark]);

  // Apply dark class to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    _setThemeMode(mode);
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  }, []);

  const toggleDarkMode = useCallback(() => {
    const newMode = isDarkMode ? 'light' : 'dark';
    setThemeMode(newMode);
  }, [isDarkMode, setThemeMode]);

  const value = useMemo(
    () => ({ themeMode, isDarkMode, setThemeMode, toggleDarkMode }),
    [themeMode, isDarkMode, setThemeMode, toggleDarkMode]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
