import { render } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton', () => {
  it('renders text variant by default', () => {
    const { container } = render(<Skeleton />);
    const line = (container.firstChild as HTMLElement).firstElementChild!;
    expect(line).toHaveClass('animate-pulse');
  });

  it('renders single line by default', () => {
    const { container } = render(<Skeleton />);
    const children = container.querySelectorAll('[class*="animate-pulse"]');
    expect(children).toHaveLength(1);
  });

  it('renders multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const wrapper = container.firstChild as HTMLElement;
    const lines = wrapper.querySelectorAll('[class*="animate-pulse"]');
    expect(lines).toHaveLength(3);
  });

  it('makes last line shorter when multiple lines', () => {
    const { container } = render(<Skeleton lines={3} />);
    const wrapper = container.firstChild as HTMLElement;
    const lines = wrapper.querySelectorAll('[class*="animate-pulse"]');
    expect(lines[2]).toHaveClass('w-3/4');
    expect(lines[0]).not.toHaveClass('w-3/4');
  });

  it('renders circular variant', () => {
    const { container } = render(<Skeleton variant='circular' />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('renders rectangular variant', () => {
    const { container } = render(<Skeleton variant='rectangular' />);
    expect(container.firstChild).toHaveClass('rounded-lg');
  });

  it('marks the placeholder aria-hidden (decorative) across variants', () => {
    const { container: text } = render(<Skeleton />);
    expect(text.firstChild).toHaveAttribute('aria-hidden', 'true');
    const { container: circ } = render(<Skeleton variant='circular' />);
    expect(circ.firstChild).toHaveAttribute('aria-hidden', 'true');
    const { container: rect } = render(<Skeleton variant='rectangular' />);
    expect(rect.firstChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom width and height to circular variant', () => {
    const { container } = render(
      <Skeleton variant='circular' width={60} height={60} />
    );
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveClass('rounded-full');
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
      const line = (container.firstChild as HTMLElement).firstElementChild!;
      expect(line).toHaveClass('h-4');
    });

    it('applies sm text line height', () => {
      const { container } = render(<Skeleton size='sm' />);
      const line = (container.firstChild as HTMLElement).firstElementChild!;
      expect(line).toHaveClass('h-3');
    });

    it('applies lg text line height', () => {
      const { container } = render(<Skeleton size='lg' />);
      const line = (container.firstChild as HTMLElement).firstElementChild!;
      expect(line).toHaveClass('h-5');
    });

    it('uses sm circular default size', () => {
      const { container } = render(<Skeleton variant='circular' size='sm' />);
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass('rounded-full');
      expect(el.style.width).toBe('32px');
    });

    it('uses lg rectangular default height', () => {
      const { container } = render(
        <Skeleton variant='rectangular' size='lg' />
      );
      const el = container.firstChild as HTMLElement;
      expect(el).toHaveClass('rounded-lg');
      expect(el.style.height).toBe('180px');
    });
  });
});
