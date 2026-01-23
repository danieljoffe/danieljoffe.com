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
    expect(badge).toHaveClass('bg-background-elevated');
  });

  it('applies accent variant styles', () => {
    render(<Badge variant='accent'>Accent</Badge>);
    const badge = screen.getByText('Accent');
    expect(badge).toHaveClass('bg-accent-muted');
  });

  it('applies success variant styles', () => {
    render(<Badge variant='success'>Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-success-muted');
  });

  it('applies warning variant styles', () => {
    render(<Badge variant='warning'>Warning</Badge>);
    const badge = screen.getByText('Warning');
    expect(badge).toHaveClass('bg-warning-muted');
  });

  it('applies error variant styles', () => {
    render(<Badge variant='error'>Error</Badge>);
    const badge = screen.getByText('Error');
    expect(badge).toHaveClass('bg-error-muted');
  });

  it('applies info variant styles', () => {
    render(<Badge variant='info'>Info</Badge>);
    const badge = screen.getByText('Info');
    expect(badge).toHaveClass('bg-info-muted');
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
});
