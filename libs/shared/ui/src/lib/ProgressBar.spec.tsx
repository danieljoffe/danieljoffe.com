import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders progress bar element', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('bg-surface-elevated');
  });

  it('renders with correct percentage width', () => {
    render(<ProgressBar value={75} />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveStyle({ width: '75%' });
  });

  it('calculates percentage based on max value', () => {
    render(<ProgressBar value={50} max={200} />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveStyle({ width: '25%' });
  });

  it('caps percentage at 100%', () => {
    render(<ProgressBar value={150} max={100} />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('does not go below 0%', () => {
    render(<ProgressBar value={-10} />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveStyle({ width: '0%' });
  });

  it('applies accent variant by default', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveClass('bg-brand-500');
  });

  it('applies success variant styles', () => {
    render(<ProgressBar value={50} variant='success' />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveClass('bg-success');
  });

  it('applies warning variant styles', () => {
    render(<ProgressBar value={80} variant='warning' />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveClass('bg-warning');
  });

  it('applies error variant styles', () => {
    render(<ProgressBar value={50} variant='error' />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveClass('bg-error');
  });

  it('applies md size by default', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('h-2');
  });

  it('applies sm size styles', () => {
    render(<ProgressBar value={50} size='sm' />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('h-1');
  });

  it('applies lg size styles', () => {
    render(<ProgressBar value={50} size='lg' />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('h-3');
  });

  it('does not show label by default', () => {
    render(<ProgressBar value={50} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('shows label when showLabel is true', () => {
    render(<ProgressBar value={50} showLabel />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('rounds percentage in label', () => {
    render(<ProgressBar value={33.7} showLabel />);
    expect(screen.getByText('34%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ProgressBar value={50} className='custom-class' />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveClass('custom-class');
  });

  it('applies motion-reduce:transition-none to progress fill', () => {
    render(<ProgressBar value={50} />);
    const bar = screen.getByRole('progressbar');
    const fill = bar.firstElementChild!;
    expect(fill).toHaveClass('motion-reduce:transition-none');
  });

  describe('accessibility', () => {
    it('has role="progressbar"', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('has default aria-label="Progress"', () => {
      render(<ProgressBar value={50} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-label',
        'Progress'
      );
    });

    it('accepts custom aria-label', () => {
      render(<ProgressBar value={50} aria-label='Upload progress' />);
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-label',
        'Upload progress'
      );
    });

    it('sets aria-valuenow with rounded percentage', () => {
      render(<ProgressBar value={33.7} />);
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'aria-valuenow',
        '34'
      );
    });

    it('sets aria-valuemin and aria-valuemax', () => {
      render(<ProgressBar value={50} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuemin', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    });
  });
});
