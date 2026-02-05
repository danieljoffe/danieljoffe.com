import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert', () => {
  it('renders children content', () => {
    render(<Alert>Test message</Alert>);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Alert title='Alert Title'>Content</Alert>);
    expect(screen.getByText('Alert Title')).toBeInTheDocument();
  });

  it('applies default info variant', () => {
    const { container } = render(<Alert>Content</Alert>);
    expect(container.firstChild).toHaveClass('bg-info-muted');
  });

  it('applies success variant styles', () => {
    const { container } = render(<Alert variant='success'>Content</Alert>);
    expect(container.firstChild).toHaveClass('bg-success-muted');
  });

  it('applies warning variant styles', () => {
    const { container } = render(<Alert variant='warning'>Content</Alert>);
    expect(container.firstChild).toHaveClass('bg-warning-muted');
  });

  it('applies error variant styles', () => {
    const { container } = render(<Alert variant='error'>Content</Alert>);
    expect(container.firstChild).toHaveClass('bg-error-muted');
  });

  it('does not show dismiss button by default', () => {
    render(<Alert>Content</Alert>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows dismiss button when dismissible is true', () => {
    render(<Alert dismissible>Content</Alert>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = jest.fn();
    render(
      <Alert dismissible onDismiss={onDismiss}>
        Content
      </Alert>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    const { container } = render(
      <Alert className='custom-class'>Content</Alert>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
