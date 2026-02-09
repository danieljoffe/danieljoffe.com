import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  // Initialize with server-safe defaults to prevent hydration mismatch.
  // A blocking <script> in Head.tsx applies the correct `dark` class before
  // paint, so the visual theme is correct even before this state syncs.
  const [themeMode, _setThemeMode] = useState<ThemeMode>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const prevIsMobileRef = useRef(isMobile);

  // Sync theme state from localStorage/system preference after mount.
  // Uses queueMicrotask to avoid synchronous setState within effect body.
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

  // Close modal when transitioning from mobile to desktop
  useEffect(() => {
    const wasOnMobile = prevIsMobileRef.current;
    const isNowDesktop = !isMobile;

    // Only close if we were on mobile and are now on desktop
    // Using queueMicrotask to avoid synchronous setState in effect (react-hooks/set-state-in-effect)
    if (isModalOpen && wasOnMobile && isNowDesktop) {
      queueMicrotask(() => _setIsModalOpen(false));
    }

    prevIsMobileRef.current = isMobile;
  }, [isMobile, isModalOpen]);

  // Sync body overflow with modal state (DOM side effect)
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('overflow-y-hidden');
    } else {
      document.body.classList.remove('overflow-y-hidden');
    }
  }, [isModalOpen]);

  return (
    <GlobalContext.Provider value={value}>{children}</GlobalContext.Provider>
  );
}
