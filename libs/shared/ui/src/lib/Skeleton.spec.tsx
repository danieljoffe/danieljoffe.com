import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders text variant by default', () => {
    const { container } = render(<Skeleton />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders single line by default', () => {
    const { container } = render(<Skeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements).toHaveLength(1);
  });

  it('renders multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    expect(pulseElements).toHaveLength(3);
  });

  it('makes last line shorter when multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const lines = container.querySelectorAll('.animate-pulse');
    expect(lines[2]).toHaveClass('w-3/4');
    expect(lines[0]).not.toHaveClass('w-3/4');
  });

  it('renders circular variant', () => {
    const { container } = render(<Skeleton variant='circular' />);
    expect(container.querySelector('.rounded-full')).toBeInTheDocument();
  });

  it('renders rectangular variant', () => {
    const { container } = render(<Skeleton variant='rectangular' />);
    expect(container.querySelector('.rounded-lg')).toBeInTheDocument();
  });

  it('applies custom width and height to circular variant', () => {
    const { container } = render(
      <Skeleton variant='circular' width={60} height={60} />
    );
    const el = container.querySelector('.rounded-full') as HTMLElement;
    expect(el.style.width).toBe('60px');
    expect(el.style.height).toBe('60px');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className='custom-class' />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  describe('sizes', () => {
    it('applies md text line height by default', () => {
      const { container } = render(<Skeleton />);
      expect(container.querySelector('.h-4')).toBeInTheDocument();
    });

    it('applies sm text line height', () => {
      const { container } = render(<Skeleton size='sm' />);
      expect(container.querySelector('.h-3')).toBeInTheDocument();
    });

    it('applies lg text line height', () => {
      const { container } = render(<Skeleton size='lg' />);
      expect(container.querySelector('.h-5')).toBeInTheDocument();
    });

    it('uses sm circular default size', () => {
      const { container } = render(<Skeleton variant='circular' size='sm' />);
      const el = container.querySelector('.rounded-full') as HTMLElement;
      expect(el.style.width).toBe('32px');
    });

    it('uses lg rectangular default height', () => {
      const { container } = render(
        <Skeleton variant='rectangular' size='lg' />
      );
      const el = container.querySelector('.rounded-lg') as HTMLElement;
      expect(el.style.height).toBe('180px');
    });
  });
});
