import { renderHook, act } from '@testing-library/react';
import { useWindowResize } from './useWindowResize';

describe('useWindowResize', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: originalInnerHeight,
    });
  });

  it('returns initial window dimensions', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 800,
    });

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.windowWidth).toBe(500);
    expect(result.current.windowHeight).toBe(800);
  });

  it('classifies mobile breakpoint correctly (< 768)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('classifies tablet breakpoint correctly (768-1023)', () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 768 });

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('classifies desktop breakpoint correctly (>= 1024)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it('adds resize event listener on mount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useWindowResize());

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    addSpy.mockRestore();
  });

  it('removes resize event listener on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWindowResize());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('updates dimensions on resize after throttle delay', () => {
    jest.useFakeTimers();
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 768,
    });

    const { result } = renderHook(() => useWindowResize());
    expect(result.current.isDesktop).toBe(true);

    // Simulate resize to mobile
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      value: 667,
    });

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    // Advance past the throttle delay (300ms in useWindowResize)
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.windowWidth).toBe(375);
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);

    jest.useRealTimers();
  });
});
