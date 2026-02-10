import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders children content', () => {
    render(<Button>Click me</Button>);
    expect(
      screen.getByRole('button', { name: 'Click me' })
    ).toBeInTheDocument();
  });

  it('applies default primary variant', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-accent');
  });

  it('applies secondary variant styles', () => {
    render(<Button variant='secondary'>Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-background-elevated');
  });

  it('applies ghost variant styles', () => {
    render(<Button variant='ghost'>Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-background-elevated');
  });

  it('applies outline variant styles', () => {
    render(<Button variant='outline'>Outline</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('border-border-strong');
  });

  it('applies success variant styles', () => {
    render(<Button variant='success'>Success</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-success');
  });

  it('applies error variant styles', () => {
    render(<Button variant='error'>Error</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-error');
  });

  it('applies warning variant styles', () => {
    render(<Button variant='warning'>Warning</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-warning');
  });

  it('applies info variant styles', () => {
    render(<Button variant='info'>Info</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-info');
  });

  it('applies default md size', () => {
    render(<Button>Medium</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-4', 'py-3');
  });

  it('applies sm size styles', () => {
    render(<Button size='sm'>Small</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');
  });

  it('applies lg size styles', () => {
    render(<Button size='lg'>Large</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies disabled state', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Button className='custom-class'>Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('applies bare variant styles (empty string)', () => {
    render(<Button variant='bare'>Bare</Button>);
    const button = screen.getByRole('button');
    // bare variant has no bg-* or border-* variant styles
    expect(button).not.toHaveClass('bg-accent');
    expect(button).not.toHaveClass('bg-background-elevated');
    expect(button).not.toHaveClass('border-border-strong');
  });

  it('applies accent variant styles', () => {
    render(<Button variant='accent'>Accent</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-accent', 'text-accent-foreground');
  });

  it('passes through additional props', () => {
    render(
      <Button type='submit' data-testid='submit-btn'>
        Submit
      </Button>
    );
    const button = screen.getByTestId('submit-btn');
    expect(button).toHaveAttribute('type', 'submit');
  });
});
