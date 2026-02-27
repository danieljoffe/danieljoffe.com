import { renderHook, act } from '@testing-library/react';
import { useWindowResize } from '../useWindowResize';

describe('useWindowResize', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  function setWindowSize(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });
  }

  afterEach(() => {
    // Restore original window dimensions
    setWindowSize(originalInnerWidth, originalInnerHeight);
  });

  it('returns initial window dimensions', () => {
    setWindowSize(1280, 720);

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.windowWidth).toBe(1280);
    expect(result.current.windowHeight).toBe(720);
  });

  it('returns isDesktop true for width >= 1024', () => {
    setWindowSize(1024, 768);

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isMobile).toBe(false);
  });

  it('returns isTablet true for width >= 768 and < 1024', () => {
    setWindowSize(800, 600);

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('returns isMobile true for width < 768', () => {
    setWindowSize(375, 667);

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('adds a resize event listener on mount', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');

    renderHook(() => useWindowResize());

    expect(addSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    addSpy.mockRestore();
  });

  it('removes the resize event listener on unmount', () => {
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWindowResize());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));

    removeSpy.mockRestore();
  });

  it('updates dimensions when window is resized', () => {
    jest.useFakeTimers();

    setWindowSize(1280, 720);

    const { result } = renderHook(() => useWindowResize());

    expect(result.current.windowWidth).toBe(1280);

    // Simulate resize
    act(() => {
      setWindowSize(500, 800);
      window.dispatchEvent(new Event('resize'));
    });

    // The throttle delay is 300ms -- the first call should be immediate
    // since enough time has passed (fake timers start at 0, lastCall starts at 0)
    // but we need to ensure the state update is flushed
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.windowWidth).toBe(500);
    expect(result.current.windowHeight).toBe(800);
    expect(result.current.isMobile).toBe(true);

    jest.useRealTimers();
  });
});
