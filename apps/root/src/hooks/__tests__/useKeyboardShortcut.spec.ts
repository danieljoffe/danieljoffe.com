import { renderHook } from '@testing-library/react';
import { useKeyboardShortcut } from '../useKeyboardShortcut';

function fireKeyDown(
  key: string,
  options: Partial<KeyboardEvent> = {},
  target?: HTMLElement
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    ...options,
  });
  if (target) {
    Object.defineProperty(event, 'target', { value: target });
  }
  document.dispatchEvent(event);
}

describe('useKeyboardShortcut', () => {
  it('fires callback when the key is pressed', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    fireKeyDown('k');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('is case-insensitive', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    fireKeyDown('K');
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('ignores when a different key is pressed', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    fireKeyDown('j');
    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores when meta key is held', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    fireKeyDown('k', { metaKey: true });
    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores when ctrl key is held', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    fireKeyDown('k', { ctrlKey: true });
    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores when alt key is held', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    fireKeyDown('k', { altKey: true });
    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores when an input is focused', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    const input = document.createElement('input');
    fireKeyDown('k', {}, input);
    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores when a textarea is focused', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    const textarea = document.createElement('textarea');
    fireKeyDown('k', {}, textarea);
    expect(callback).not.toHaveBeenCalled();
  });

  it('ignores when a select is focused', () => {
    const callback = jest.fn();
    renderHook(() => useKeyboardShortcut('k', callback));

    const select = document.createElement('select');
    fireKeyDown('k', {}, select);
    expect(callback).not.toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const callback = jest.fn();
    const { unmount } = renderHook(() => useKeyboardShortcut('k', callback));

    // Verify it works before unmount
    fireKeyDown('k');
    expect(callback).toHaveBeenCalledTimes(1);

    callback.mockClear();
    unmount();

    // After unmount, callback should not fire
    fireKeyDown('k');
    expect(callback).toHaveBeenCalledTimes(0);
  });
});
