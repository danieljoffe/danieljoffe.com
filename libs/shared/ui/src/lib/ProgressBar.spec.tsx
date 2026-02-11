import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('renders progress bar element', () => {
    const { container } = render(<ProgressBar value={50} />);
    expect(
      container.querySelector('.bg-background-elevated')
    ).toBeInTheDocument();
  });

  it('renders with correct percentage width', () => {
    const { container } = render(<ProgressBar value={75} />);
    const progressFill = container.querySelector('.bg-accent');
    expect(progressFill).toHaveStyle({ width: '75%' });
  });

  it('calculates percentage based on max value', () => {
    const { container } = render(<ProgressBar value={50} max={200} />);
    const progressFill = container.querySelector('.bg-accent');
    expect(progressFill).toHaveStyle({ width: '25%' });
  });

  it('caps percentage at 100%', () => {
    const { container } = render(<ProgressBar value={150} max={100} />);
    const progressFill = container.querySelector('.bg-accent');
    expect(progressFill).toHaveStyle({ width: '100%' });
  });

  it('does not go below 0%', () => {
    const { container } = render(<ProgressBar value={-10} />);
    const progressFill = container.querySelector('.bg-accent');
    expect(progressFill).toHaveStyle({ width: '0%' });
  });

  it('applies accent variant by default', () => {
    const { container } = render(<ProgressBar value={50} />);
    expect(container.querySelector('.bg-accent')).toBeInTheDocument();
  });

  it('applies success variant styles', () => {
    const { container } = render(<ProgressBar value={50} variant='success' />);
    expect(container.querySelector('.bg-success')).toBeInTheDocument();
  });

  it('applies warning variant styles', () => {
    const { container } = render(<ProgressBar value={50} variant='warning' />);
    expect(container.querySelector('.bg-warning')).toBeInTheDocument();
  });

  it('applies error variant styles', () => {
    const { container } = render(<ProgressBar value={50} variant='error' />);
    expect(container.querySelector('.bg-error')).toBeInTheDocument();
  });

  it('applies info variant styles', () => {
    const { container } = render(<ProgressBar value={50} variant='info' />);
    expect(container.querySelector('.bg-info')).toBeInTheDocument();
  });

  it('applies md size by default', () => {
    const { container } = render(<ProgressBar value={50} />);
    expect(container.querySelector('.h-2')).toBeInTheDocument();
  });

  it('applies sm size styles', () => {
    const { container } = render(<ProgressBar value={50} size='sm' />);
    expect(container.querySelector('.h-1')).toBeInTheDocument();
  });

  it('applies lg size styles', () => {
    const { container } = render(<ProgressBar value={50} size='lg' />);
    expect(container.querySelector('.h-3')).toBeInTheDocument();
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
    const { container } = render(
      <ProgressBar value={50} className='custom-class' />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
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
