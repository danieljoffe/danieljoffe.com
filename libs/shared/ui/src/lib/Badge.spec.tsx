import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  it('renders children content', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-surface-elevated');
  });

  it('applies success variant styles', () => {
    render(<Badge variant='success'>Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-success-light');
  });

  it('applies warning variant styles', () => {
    render(<Badge variant='warning'>Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-warning-light');
  });

  it('applies error variant styles', () => {
    render(<Badge variant='error'>Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge).toHaveClass('bg-error-light');
  });

  it('applies info variant styles', () => {
    render(<Badge variant='info'>Info</Badge>);
    const badge = screen.getByText('Info');
    expect(badge).toHaveClass('bg-info-light');
  });

  it('applies brand variant styles', () => {
    render(<Badge variant='brand'>Brand</Badge>);
    const badge = screen.getByText('Brand');
    expect(badge).toHaveClass('bg-brand-50');
    expect(badge).toHaveClass('text-brand-700');
  });

  it('applies brand-solid variant styles', () => {
    render(<Badge variant='brand-solid'>Solid</Badge>);
    const badge = screen.getByText('Solid');
    expect(badge).toHaveClass('bg-brand-600');
    expect(badge).toHaveClass('text-white');
  });

  it('applies custom className', () => {
    render(<Badge className='custom-class'>Badge</Badge>);
    const badge = screen.getByText('Badge');
    expect(badge).toHaveClass('custom-class');
  });

  it('renders as a span element', () => {
    render(<Badge>Badge</Badge>);
    const badge = screen.getByText('Badge');
    expect(badge.tagName).toBe('SPAN');
  });

  describe('accessibility', () => {
    it('renders as inline text visible to screen readers', () => {
      render(<Badge>Status</Badge>);
      expect(screen.getByText('Status')).toBeVisible();
    });

    it('does not use a role that implies interactivity', () => {
      render(<Badge>Info</Badge>);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });
});
