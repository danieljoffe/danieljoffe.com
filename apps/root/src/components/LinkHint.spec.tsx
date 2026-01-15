import React from 'react';
import { render } from '@testing-library/react';
import LinkHint from './LinkHint';

describe('LinkHint', () => {
  test('renders the arrow icon SVG', () => {
    const { container } = render(<LinkHint />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  test('renders with flex layout for centering', () => {
    const { container } = render(<LinkHint />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('flex');
    expect(span?.className).toContain('items-center');
    expect(span?.className).toContain('justify-center');
  });

  test('renders SVG icon with proper dimensions', () => {
    const { container } = render(<LinkHint />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains('w-4')).toBe(true);
    expect(svg?.classList.contains('h-4')).toBe(true);
  });

  test('renders with full height container', () => {
    const { container } = render(<LinkHint />);
    const span = container.querySelector('span');
    expect(span?.className).toContain('h-full');
  });
});
