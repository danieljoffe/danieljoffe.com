import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from './Input';

describe('Input', () => {
  it('renders input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label='Email' />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('associates label with input', () => {
    render(<Input label='Email' />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Email');
    expect(label).toHaveAttribute('for', input.id);
  });

  it('generates id when id not provided', () => {
    render(<Input label='Email Address' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id');
    expect(input.id).toBeTruthy();
  });

  it('uses provided id over generated one', () => {
    render(<Input id='custom-id' label='Email' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'custom-id');
  });

  it('renders error message when provided', () => {
    render(<Input error='Invalid email' />);
    expect(screen.getByText('Invalid email')).toBeInTheDocument();
  });

  it('applies error styles when error is provided', () => {
    render(<Input error='Error' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error');
  });

  it('renders helper text when provided', () => {
    render(<Input helperText='Enter your email' />);
    expect(screen.getByText('Enter your email')).toBeInTheDocument();
  });

  it('does not render helper text when error is present', () => {
    render(<Input error='Error' helperText='Helper' />);
    expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders with placeholder', () => {
    render(<Input placeholder='Enter text' />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Input disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Input className='custom-class' />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });

  it('passes through additional input props', () => {
    render(<Input type='email' name='email' data-testid='email-input' />);
    const input = screen.getByTestId('email-input');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
  });

  it('applies success styles when success is true', () => {
    render(<Input success />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-success');
  });

  it('prioritizes error styles over success styles', () => {
    render(<Input error='Error' success />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-error');
    expect(input).not.toHaveClass('border-success');
  });

  it('shows required indicator in label', () => {
    render(<Input label='Email' required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('sets aria-required when required', () => {
    render(<Input label='Email' required />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  it('accepts ref via forwardRef', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  describe('accessibility', () => {
    it('sets aria-invalid="true" when error is present', () => {
      render(<Input error='Invalid' />);
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    it('does not set aria-invalid when no error', () => {
      render(<Input />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });

    it('links input to error message via aria-describedby', () => {
      render(<Input id='email' error='Required' />);
      const input = screen.getByRole('textbox');
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBe('email-error');
      expect(screen.getByRole('alert')).toHaveAttribute('id', describedBy);
    });

    it('links input to helper text via aria-describedby', () => {
      render(<Input id='email' helperText='Enter your email' />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'email-helper');
    });

    it('renders error message with role="alert"', () => {
      render(<Input error='This field is required' />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This field is required'
      );
    });
  });
});
