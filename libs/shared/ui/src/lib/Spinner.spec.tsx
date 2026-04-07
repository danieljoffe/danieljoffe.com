import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders spinner element', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('animate-spin');
  });

  it('applies md size by default', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('size-8');
  });

  it('applies sm size styles', () => {
    const { container } = render(<Spinner size='sm' />);
    expect(container.firstChild).toHaveClass('size-4');
  });

  it('applies lg size styles', () => {
    const { container } = render(<Spinner size='lg' />);
    expect(container.firstChild).toHaveClass('size-12');
  });

  it('applies accent variant by default', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toHaveClass('border-t-accent');
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

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('has default aria-label="Loading"', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Loading'
      );
    });

    it('accepts custom aria-label', () => {
      render(<Spinner aria-label='Submitting form' />);
      expect(screen.getByRole('status')).toHaveAttribute(
        'aria-label',
        'Submitting form'
      );
    });
  });
});
