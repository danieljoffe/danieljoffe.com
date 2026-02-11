'use client';

import { WindowSize } from '@/types/base';
import { createContext, useContext } from 'react';

export type ModalState = {
  isModalOpen: boolean;
  toggleModal: () => void;
  modalContent: React.ReactNode | null;
  setModalContent: (content: React.ReactNode) => void;
};

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeState = {
  themeMode: ThemeMode;
  isDarkMode: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleDarkMode: () => void;
};

export type GlobalContextValue = WindowSize & ModalState & ThemeState;

const noop = () => undefined;

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
  toggleModal: noop,
  setModalContent: noop,
  setThemeMode: noop,
  toggleDarkMode: noop,
};

export const GlobalContext = createContext<GlobalContextValue>(GlobalState);

export function useGlobal(): GlobalContextValue {
  return useContext(GlobalContext);
}
