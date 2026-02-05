import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { GlobalContext, GlobalState, ThemeMode } from './Context';
import { useWindowResize } from '@/hooks/windowResize';

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

export default function GlobalProvider({ children }: { children: ReactNode }) {
  const { windowWidth, windowHeight, isMobile, isTablet, isDesktop } =
    useWindowResize();
  const [isModalOpen, _setIsModalOpen] = useState(GlobalState.isModalOpen);
  const [modalContent, _setModalContent] = useState(GlobalState.modalContent);
  const [themeMode, _setThemeMode] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    _setThemeMode(getStoredThemeMode());
    setSystemPrefersDark(getSystemPrefersDark());

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemPrefersDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isDarkMode = useMemo(() => {
    if (themeMode === 'system') {
      return systemPrefersDark;
    }
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

  const toggleModal = useCallback(() => {
    _setIsModalOpen((open: boolean) => !open);
  }, []);

  const setModalContent = useCallback((content: React.ReactNode) => {
    _setIsModalOpen(content !== null);
    _setModalContent(content);
  }, []);

  const value = useMemo(
    () => ({
      isModalOpen,
      toggleModal,
      modalContent,
      setModalContent,
      windowWidth,
      windowHeight,
      isMobile,
      isTablet,
      isDesktop,
      themeMode,
      isDarkMode,
      setThemeMode,
      toggleDarkMode,
    }),
    [
      isModalOpen,
      toggleModal,
      modalContent,
      setModalContent,
      windowWidth,
      windowHeight,
      isMobile,
      isTablet,
      isDesktop,
      themeMode,
      isDarkMode,
      setThemeMode,
      toggleDarkMode,
    ]
  );

  useEffect(() => {
    if (isModalOpen && !isMobile) {
      toggleModal();
    }
    if (isModalOpen) {
      document.body.classList.add('overflow-y-hidden');
    } else {
      document.body.classList.remove('overflow-y-hidden');
    }
  }, [isModalOpen, isMobile, toggleModal, isDesktop]);

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
}
