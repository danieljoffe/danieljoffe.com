import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ScrollToTop } from './ScrollToTop';

describe('ScrollToTop', () => {
  let scrollHandler: EventListener;

  beforeEach(() => {
    jest
      .spyOn(window, 'addEventListener')
      .mockImplementation((event, handler) => {
        if (event === 'scroll') scrollHandler = handler as EventListener;
      });
    jest.spyOn(window, 'removeEventListener');
    window.scrollTo = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders a button with accessible label', () => {
    render(<ScrollToTop />);
    expect(
      screen.getByRole('button', { name: /scroll to top/i })
    ).toBeInTheDocument();
  });

  test('is hidden by default (below threshold)', () => {
    render(<ScrollToTop />);
    const button = screen.getByRole('button', { name: /scroll to top/i });
    expect(button).toHaveClass('opacity-0', 'pointer-events-none');
  });

  test('becomes visible after scrolling past threshold', () => {
    render(<ScrollToTop />);
    const button = screen.getByRole('button', { name: /scroll to top/i });

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
      scrollHandler(new Event('scroll'));
    });

    expect(button).toHaveClass('opacity-100');
    expect(button).not.toHaveClass('pointer-events-none');
  });

  test('hides again when scrolling back above threshold', () => {
    render(<ScrollToTop />);
    const button = screen.getByRole('button', { name: /scroll to top/i });

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
      scrollHandler(new Event('scroll'));
    });
    expect(button).toHaveClass('opacity-100');

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 100, writable: true });
      scrollHandler(new Event('scroll'));
    });
    expect(button).toHaveClass('opacity-0');
  });

  test('calls window.scrollTo with smooth behavior on click', () => {
    render(<ScrollToTop />);
    const button = screen.getByRole('button', { name: /scroll to top/i });

    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 400, writable: true });
      scrollHandler(new Event('scroll'));
    });

    fireEvent.click(button);
    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: 'smooth',
    });
  });

  test('cleans up scroll listener on unmount', () => {
    const { unmount } = render(<ScrollToTop />);
    unmount();
    expect(window.removeEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function)
    );
  });
});
