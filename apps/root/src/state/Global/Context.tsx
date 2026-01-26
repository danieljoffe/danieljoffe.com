'use client';

import { WindowSizeInterface } from '@/hooks/windowResize';
import { createContext, useContext } from 'react';

export type ModalInterface = {
  isModalOpen: boolean;
  toggleModal: () => void;
  modalContent: React.ReactNode | null;
  setModalContent: (content: React.ReactNode) => void;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeInterface = {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
};

export type GlobalContextValue = WindowSizeInterface &
  ModalInterface &
  ThemeInterface;

export const GlobalState: GlobalContextValue = {
  windowWidth: 400,
  windowHeight: 600,
  isMobile: true,
  isTablet: false,
  isDesktop: false,
  isModalOpen: false,
  modalContent: null,
  themeMode: 'system',
  isDarkMode: false,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleModal: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setModalContent: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setThemeMode: () => {},
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  toggleDarkMode: () => {},
};

export const GlobalContext = createContext<GlobalContextValue>(GlobalState);

export function useGlobal(): GlobalContextValue {
  return useContext(GlobalContext);
}
