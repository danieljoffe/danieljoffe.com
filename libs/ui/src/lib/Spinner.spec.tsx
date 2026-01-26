import { render } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders spinner element', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('animate-spin');
  });

  it('applies md size by default', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('w-8', 'h-8');
  });

  it('applies sm size styles', () => {
    const { container } = render(<Spinner size='sm' />);
    expect(container.firstChild).toHaveClass('w-4', 'h-4');
  });

  it('applies lg size styles', () => {
    const { container } = render(<Spinner size='lg' />);
    expect(container.firstChild).toHaveClass('w-12', 'h-12');
  });

  it('applies accent variant by default', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('border-t-accent');
  });

  it('applies success variant styles', () => {
    const { container } = render(<Spinner variant='success' />);
    expect(container.firstChild).toHaveClass('border-t-success');
  });

  it('applies warning variant styles', () => {
    const { container } = render(<Spinner variant='warning' />);
    expect(container.firstChild).toHaveClass('border-t-warning');
  });

  it('applies error variant styles', () => {
    const { container } = render(<Spinner variant='error' />);
    expect(container.firstChild).toHaveClass('border-t-error');
  });

  it('applies info variant styles', () => {
    const { container } = render(<Spinner variant='info' />);
    expect(container.firstChild).toHaveClass('border-t-info');
  });

  it('applies foreground variant styles', () => {
    const { container } = render(<Spinner variant='foreground' />);
    expect(container.firstChild).toHaveClass('border-t-foreground');
  });

  it('renders as inline-block element', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('inline-block');
  });

  it('has rounded-full class for circular shape', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('applies border styles for spinner effect', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('border-2');
  });

  it('applies thicker border for lg size', () => {
    const { container } = render(<Spinner size='lg' />);
    expect(container.firstChild).toHaveClass('border-3');
  });
});
