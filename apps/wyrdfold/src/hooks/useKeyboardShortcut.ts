import { useEffect } from 'react';

/**
 * Registers a global keyboard shortcut that fires only when no input/textarea
 * is focused and no modifier keys are held.
 */
export function useKeyboardShortcut(key: string, callback: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [key, callback]);
}
