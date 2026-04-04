import { render, screen } from '@testing-library/react';
import { Divider } from './Divider';

describe('Divider', () => {
  it('renders horizontal divider by default', () => {
    const { container } = render(<Divider />);
    const divider = container.firstChild;
    expect(divider).toHaveClass('h-px', 'bg-border');
  });

  it('renders vertical divider when orientation is vertical', () => {
    const { container } = render(<Divider orientation='vertical' />);
    const divider = container.firstChild;
    expect(divider).toHaveClass('w-px', 'bg-border');
  });

  it('renders label when provided', () => {
    render(<Divider label='OR' />);
    expect(screen.getByText('OR')).toBeInTheDocument();
  });

  it('renders divider lines on both sides of label', () => {
    const { container } = render(<Divider label='OR' />);
    const dividerLines = container.querySelectorAll('.h-px.bg-border');
    expect(dividerLines).toHaveLength(2);
  });

  it('applies custom className to horizontal divider', () => {
    const { container } = render(<Divider className='my-4' />);
    const divider = container.firstChild;
    expect(divider).toHaveClass('my-4');
  });

  it('applies custom className to vertical divider', () => {
    const { container } = render(
      <Divider orientation='vertical' className='mx-4' />
    );
    const divider = container.firstChild;
    expect(divider).toHaveClass('mx-4');
  });

  it('applies custom className to labeled divider', () => {
    const { container } = render(<Divider label='OR' className='my-8' />);
    const divider = container.firstChild;
    expect(divider).toHaveClass('my-8');
  });

  it('renders label with correct styling', () => {
    render(<Divider label='Separator' />);
    const label = screen.getByText('Separator');
    expect(label).toHaveClass('text-sm', 'text-text-tertiary');
  });

  it('ignores label when orientation is vertical', () => {
    const { container } = render(<Divider orientation='vertical' label='OR' />);
    expect(screen.queryByText('OR')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveClass('w-px');
  });

  describe('accessibility', () => {
    it('has role="separator" on horizontal divider', () => {
      render(<Divider />);
      expect(screen.getByRole('separator')).toBeInTheDocument();
    });

    it('has aria-orientation="horizontal" on horizontal divider', () => {
      render(<Divider />);
      expect(screen.getByRole('separator')).toHaveAttribute(
        'aria-orientation',
        'horizontal'
      );
    });

    it('has aria-orientation="vertical" on vertical divider', () => {
      render(<Divider orientation='vertical' />);
      expect(screen.getByRole('separator')).toHaveAttribute(
        'aria-orientation',
        'vertical'
      );
    });

    it('has aria-hidden="true" on decorative lines in labeled divider', () => {
      const { container } = render(<Divider label='OR' />);
      const hiddenLines = container.querySelectorAll('[aria-hidden="true"]');
      expect(hiddenLines).toHaveLength(2);
    });

    it('has role="separator" on labeled divider', () => {
      render(<Divider label='OR' />);
      expect(screen.getByRole('separator')).toHaveAttribute(
        'aria-orientation',
        'horizontal'
      );
    });
  });
});
