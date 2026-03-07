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
    const { container } = render(<Loading />);
    const dots = container.querySelectorAll('.rounded-full.size-2');
    expect(dots.length).toBe(4);
  });

  it('renders dots with correct color variants', () => {
    const { container } = render(<Loading />);
    const dots = container.querySelectorAll('.rounded-full.size-2');
    expect(dots[0]).toHaveClass('bg-accent');
    expect(dots[1]).toHaveClass('bg-accent/60');
    expect(dots[2]).toHaveClass('bg-accent');
    expect(dots[3]).toHaveClass('bg-accent/60');
  });
});
