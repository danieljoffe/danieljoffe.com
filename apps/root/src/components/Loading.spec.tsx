import React from 'react';
import { render, screen } from '@testing-library/react';
import Loading from './Loading';

// Mock constants
jest.mock('@/utils/constants', () => ({
  A11Y: {
    LOADING_TEXT: 'Content is loading, please wait.',
  },
}));

describe('Loading', () => {
  test('renders loading text', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  test('has proper accessibility attributes', () => {
    render(<Loading />);
    const container = screen.getByRole('status');
    expect(container).toBeInTheDocument();
    expect(container).toHaveAttribute('aria-live', 'polite');
    expect(container).toHaveAttribute('aria-label', 'Loading content');
  });

  test('renders screen reader text', () => {
    render(<Loading />);
    const srText = document.querySelector('.sr-only');
    expect(srText).toBeInTheDocument();
  });

  test('renders spinner elements', () => {
    const { container } = render(<Loading />);
    const spinners = container.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  test('renders bouncing dots', () => {
    const { container } = render(<Loading />);
    const dots = container.querySelectorAll('.animate-bounce-subtle');
    expect(dots.length).toBe(3);
  });

  test('renders with min-height for layout stability', () => {
    render(<Loading />);
    const container = screen.getByRole('status');
    expect(container.className).toContain('min-h-[200px]');
  });

  test('renders with full width', () => {
    render(<Loading />);
    const container = screen.getByRole('status');
    expect(container.className).toContain('w-full');
  });

  test('applies centered flex layout', () => {
    render(<Loading />);
    const container = screen.getByRole('status');
    expect(container.className).toContain('flex');
    expect(container.className).toContain('items-center');
    expect(container.className).toContain('justify-center');
  });

  test('renders pulsing text', () => {
    render(<Loading />);
    const loadingText = screen.getByText('Loading...');
    expect(loadingText.className).toContain('animate-pulse-slow');
  });
});
