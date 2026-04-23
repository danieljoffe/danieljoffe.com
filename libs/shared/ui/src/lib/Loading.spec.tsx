import { render, screen } from '@testing-library/react';
import { Loading } from './Loading';

describe('Loading', () => {
  it('renders loading component', () => {
    render(<Loading />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Loading content');
  });

  it('accepts custom aria-label', () => {
    render(<Loading aria-label='Loading data' />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-label', 'Loading data');
  });

  it('applies custom className', () => {
    render(<Loading className='custom-class' />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('custom-class');
  });

  it('contains loading text', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies flex centering classes', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('flex', 'items-center', 'justify-center');
  });

  it('has minimum height', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('min-h-52');
  });

  it('renders bouncing dots', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    const dots = status.querySelectorAll(
      '[class*="rounded-full"][class*="size-2"]'
    );
    expect(dots.length).toBe(4);
  });

  it('applies motion-reduce:animate-none to bouncing dots', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    const dots = status.querySelectorAll(
      '[class*="rounded-full"][class*="size-2"]'
    );
    dots.forEach(dot => {
      expect(dot).toHaveClass('motion-reduce:animate-none');
    });
  });

  it('applies motion-reduce:animate-none to loading text', () => {
    render(<Loading />);
    const text = screen.getByText('Loading...');
    expect(text).toHaveClass('motion-reduce:animate-none');
  });

  it('renders dots with correct color variants', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    const dots = status.querySelectorAll(
      '[class*="rounded-full"][class*="size-2"]'
    );
    expect(dots[0]).toHaveClass('bg-brand-500');
    expect(dots[1]).toHaveClass('bg-brand-500/60');
    expect(dots[2]).toHaveClass('bg-brand-500');
    expect(dots[3]).toHaveClass('bg-brand-500/60');
  });
});
