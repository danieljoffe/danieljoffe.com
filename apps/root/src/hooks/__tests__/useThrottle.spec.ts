import { renderHook, act } from '@testing-library/react';
import { useThrottle } from '../useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a function', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    expect(typeof result.current).toBe('function');
  });

  it('calls callback immediately on first invocation', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('passes arguments through to the callback', () => {
    const callback = jest.fn();
    const { result } = renderHook(() =>
      useThrottle(callback as (...args: never[]) => void, 300)
    );

    act(() => {
      (result.current as (...args: unknown[]) => void)('arg1', 'arg2');
    });

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
  });

  it('does not call callback again within the delay window', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current(); // immediate call
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Call again within the delay window
    act(() => {
      jest.advanceTimersByTime(100);
      result.current();
    });

    // Should not have been called again yet (scheduled via setTimeout)
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('schedules a deferred call when invoked during the throttle window', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current(); // immediate call at t=0
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Invoke again at t=100 (within the 300ms window)
    act(() => {
      jest.advanceTimersByTime(100);
      result.current();
    });

    // The deferred call should fire after the remaining 200ms
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('replaces the pending deferred call when invoked multiple times during the throttle window', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current(); // immediate at t=0
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Two rapid calls within the window
    act(() => {
      jest.advanceTimersByTime(50);
      result.current(); // schedules deferred for t=300
    });

    act(() => {
      jest.advanceTimersByTime(50);
      result.current(); // clears previous timer, schedules new deferred
    });

    // Advance past the longest possible deferred timeout
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Only the immediate call + one deferred call should have fired
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('calls callback immediately again after the delay has fully elapsed', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current(); // immediate at t=0
    });

    expect(callback).toHaveBeenCalledTimes(1);

    // Advance past the full delay
    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current(); // should call immediately since delay has elapsed
    });

    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('returns a stable function reference across renders', () => {
    const callback = jest.fn();
    const { result, rerender } = renderHook(() => useThrottle(callback, 300));

    const firstRef = result.current;
    rerender();
    const secondRef = result.current;

    expect(firstRef).toBe(secondRef);
  });
});
