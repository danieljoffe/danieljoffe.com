import { renderHook, act } from '@testing-library/react';
import { useThrottle } from './useThrottle';

describe('useThrottle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls the callback immediately on first invocation', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current();
    });

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('throttles subsequent calls within the delay window', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Call again immediately — should be deferred
    act(() => {
      result.current();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Advance past the delay
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(callback).toHaveBeenCalledTimes(2);
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

  it('cancels pending deferred call when a new one is queued', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    // First call: immediate
    act(() => {
      result.current();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    // Second call: deferred
    act(() => {
      result.current();
    });

    // Third call: should cancel second and schedule new one
    act(() => {
      result.current();
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Only 2 total: first immediate + last deferred
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('allows immediate call after delay has passed', () => {
    const callback = jest.fn();
    const { result } = renderHook(() => useThrottle(callback, 300));

    act(() => {
      result.current();
    });
    expect(callback).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    act(() => {
      result.current();
    });
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
