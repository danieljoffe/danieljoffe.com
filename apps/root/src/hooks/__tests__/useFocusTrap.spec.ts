import { renderHook } from '@testing-library/react';
import { useFocusTrap } from '../useFocusTrap';

describe('useFocusTrap', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() => useFocusTrap(false));

    expect(result.current).toBeDefined();
    expect(result.current).toHaveProperty('current');
  });

  it('does not focus anything when inactive', () => {
    container.innerHTML = '<button>First</button><button>Last</button>';
    const firstButton = container.querySelector('button') as HTMLButtonElement;
    const focusSpy = jest.spyOn(firstButton, 'focus');

    const { result } = renderHook(() => useFocusTrap(false));

    // Manually assign the container to the ref
    Object.defineProperty(result.current, 'current', {
      writable: true,
      value: container,
    });

    expect(focusSpy).not.toHaveBeenCalled();

    focusSpy.mockRestore();
  });

  it('focuses the first focusable element when activated', () => {
    container.innerHTML =
      '<button data-testid="first">First</button>' +
      '<input type="text" />' +
      '<button data-testid="last">Last</button>';

    const firstButton = container.querySelector(
      '[data-testid="first"]'
    ) as HTMLButtonElement;

    const { result, rerender } = renderHook(
      ({ isActive }) => useFocusTrap(isActive),
      { initialProps: { isActive: false } }
    );

    // Assign the container to the ref before activating
    Object.defineProperty(result.current, 'current', {
      writable: true,
      value: container,
    });

    rerender({ isActive: true });

    expect(document.activeElement).toBe(firstButton);
  });

  it('wraps focus from last element to first on Tab', () => {
    container.innerHTML =
      '<button data-testid="first">First</button>' +
      '<button data-testid="last">Last</button>';

    const firstButton = container.querySelector(
      '[data-testid="first"]'
    ) as HTMLButtonElement;
    const lastButton = container.querySelector(
      '[data-testid="last"]'
    ) as HTMLButtonElement;

    const { result, rerender } = renderHook(
      ({ isActive }) => useFocusTrap(isActive),
      { initialProps: { isActive: false } }
    );

    Object.defineProperty(result.current, 'current', {
      writable: true,
      value: container,
    });

    rerender({ isActive: true });

    // Focus is on the first element after activation; move to last
    lastButton.focus();
    expect(document.activeElement).toBe(lastButton);

    // Press Tab on the last element
    const tabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(tabEvent);

    expect(document.activeElement).toBe(firstButton);
  });

  it('wraps focus from first element to last on Shift+Tab', () => {
    container.innerHTML =
      '<button data-testid="first">First</button>' +
      '<button data-testid="last">Last</button>';

    const firstButton = container.querySelector(
      '[data-testid="first"]'
    ) as HTMLButtonElement;
    const lastButton = container.querySelector(
      '[data-testid="last"]'
    ) as HTMLButtonElement;

    const { result, rerender } = renderHook(
      ({ isActive }) => useFocusTrap(isActive),
      { initialProps: { isActive: false } }
    );

    Object.defineProperty(result.current, 'current', {
      writable: true,
      value: container,
    });

    rerender({ isActive: true });

    // Focus should be on first element after activation
    expect(document.activeElement).toBe(firstButton);

    // Press Shift+Tab on the first element
    const shiftTabEvent = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(shiftTabEvent);

    expect(document.activeElement).toBe(lastButton);
  });

  it('focuses previously focused element on Escape', () => {
    container.innerHTML =
      '<button data-testid="first">First</button>' +
      '<button data-testid="last">Last</button>';

    // Create an element outside the trap that was previously focused
    const triggerButton = document.createElement('button');
    triggerButton.setAttribute('data-previously-focused', '');
    triggerButton.textContent = 'Trigger';
    document.body.appendChild(triggerButton);

    const { result, rerender } = renderHook(
      ({ isActive }) => useFocusTrap(isActive),
      { initialProps: { isActive: false } }
    );

    Object.defineProperty(result.current, 'current', {
      writable: true,
      value: container,
    });

    rerender({ isActive: true });

    // Press Escape
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(escapeEvent);

    expect(document.activeElement).toBe(triggerButton);
    expect(triggerButton.hasAttribute('data-previously-focused')).toBe(false);

    // Clean up
    document.body.removeChild(triggerButton);
  });

  it('does nothing when there are no focusable elements', () => {
    container.innerHTML = '<div>No focusable elements here</div>';

    const { result, rerender } = renderHook(
      ({ isActive }) => useFocusTrap(isActive),
      { initialProps: { isActive: false } }
    );

    Object.defineProperty(result.current, 'current', {
      writable: true,
      value: container,
    });

    // Should not throw
    rerender({ isActive: true });

    expect(document.activeElement).not.toBe(container);
  });

  it('removes keydown event listeners on cleanup', () => {
    container.innerHTML = '<button>First</button><button>Last</button>';

    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const { result, rerender, unmount } = renderHook(
      ({ isActive }) => useFocusTrap(isActive),
      { initialProps: { isActive: false } }
    );

    Object.defineProperty(result.current, 'current', {
      writable: true,
      value: container,
    });

    rerender({ isActive: true });

    unmount();

    const keydownRemovals = removeSpy.mock.calls.filter(
      call => call[0] === 'keydown'
    );
    // Two listeners: handleTabKey and handleEscapeKey
    expect(keydownRemovals).toHaveLength(2);

    removeSpy.mockRestore();
  });
});
