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

export interface ModalContextValue {
  isModalOpen: boolean;
  toggleModal: () => void;
  modalContent: React.ReactNode | null;
  setModalContent: (content: React.ReactNode) => void;
}

const ModalContext = createContext<ModalContextValue>({
  isModalOpen: false,
  toggleModal: () => undefined,
  modalContent: null,
  setModalContent: () => undefined,
});

export function useModal(): ModalContextValue {
  return useContext(ModalContext);
}

export default function ModalProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, _setIsModalOpen] = useState(false);
  const [modalContent, _setModalContent] = useState<React.ReactNode | null>(
    null
  );

  const toggleModal = useCallback(() => {
    _setIsModalOpen((open: boolean) => !open);
  }, []);

  const setModalContent = useCallback((content: React.ReactNode) => {
    _setIsModalOpen(content !== null);
    _setModalContent(content);
  }, []);

  // Close modal when viewport crosses the md breakpoint (768px).
  // Replaces the old useWindowResize approach — matchMedia only fires on
  // breakpoint transitions, not every resize event.
  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches && isModalOpen) {
        _setIsModalOpen(false);
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isModalOpen]);

  // Sync body overflow with modal state
  useEffect(() => {
    if (isModalOpen) {
      document.body.classList.add('overflow-y-hidden');
    } else {
      document.body.classList.remove('overflow-y-hidden');
    }
  }, [isModalOpen]);

  const value = useMemo(
    () => ({ isModalOpen, toggleModal, modalContent, setModalContent }),
    [isModalOpen, toggleModal, modalContent, setModalContent]
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}
