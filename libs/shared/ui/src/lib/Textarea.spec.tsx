import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Textarea } from './Textarea';

expect.extend(toHaveNoViolations);

describe('Textarea', () => {
  it('renders textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Textarea label='Description' />);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('associates label with textarea', () => {
    render(<Textarea label='Description' />);
    const textarea = screen.getByRole('textbox');
    const label = screen.getByText('Description');
    expect(label).toHaveAttribute('for', textarea.id);
  });

  it('generates id from label when id not provided', () => {
    render(<Textarea label='Long Description' />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('id', 'long-description');
  });

  it('uses provided id over generated one', () => {
    render(<Textarea id='custom-id' label='Description' />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('id', 'custom-id');
  });

  it('renders error message when provided', () => {
    render(<Textarea error='Description is required' />);
    expect(screen.getByText('Description is required')).toBeInTheDocument();
  });

  it('applies error styles when error is provided', () => {
    render(<Textarea error='Error' />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('border-error');
  });

  it('renders helper text when provided', () => {
    render(<Textarea helperText='Max 500 characters' />);
    expect(screen.getByText('Max 500 characters')).toBeInTheDocument();
  });

  it('does not render helper text when error is present', () => {
    render(<Textarea error='Error' helperText='Helper' />);
    expect(screen.queryByText('Helper')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Textarea onChange={handleChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test content' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders with placeholder', () => {
    render(<Textarea placeholder='Enter description' />);
    const textarea = screen.getByPlaceholderText('Enter description');
    expect(textarea).toBeInTheDocument();
  });

  it('can be disabled', () => {
    render(<Textarea disabled />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Textarea className='custom-class' />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('custom-class');
  });

  it('passes through additional textarea props', () => {
    render(
      <Textarea name='description' rows={5} data-testid='desc-textarea' />
    );
    const textarea = screen.getByTestId('desc-textarea');
    expect(textarea).toHaveAttribute('name', 'description');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('applies success styles when success is true', () => {
    render(<Textarea success />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('border-success');
  });

  it('prioritizes error styles over success styles', () => {
    render(<Textarea error='Error' success />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('border-error');
    expect(textarea).not.toHaveClass('border-success');
  });

  it('shows required indicator in label', () => {
    render(<Textarea label='Description' required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('sets aria-required when required', () => {
    render(<Textarea label='Description' required />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-required', 'true');
  });

  it('accepts ref prop', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('has resize-vertical class', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toHaveClass('resize-vertical');
  });

  describe('accessibility', () => {
    it('sets aria-invalid="true" when error is present', () => {
      render(<Textarea error='Invalid' />);
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-invalid',
        'true'
      );
    });

    it('does not set aria-invalid when no error', () => {
      render(<Textarea />);
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });

    it('links textarea to error message via aria-describedby', () => {
      render(<Textarea id='desc' error='Required' />);
      const textarea = screen.getByRole('textbox');
      const describedBy = textarea.getAttribute('aria-describedby');
      expect(describedBy).toBe('desc-error');
      expect(screen.getByRole('alert')).toHaveAttribute('id', describedBy);
    });

    it('links textarea to helper text via aria-describedby', () => {
      render(<Textarea id='desc' helperText='Max 500 chars' />);
      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveAttribute('aria-describedby', 'desc-helper');
    });

    it('renders error message with role="alert"', () => {
      render(<Textarea error='Description is required' />);
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Description is required'
      );
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Textarea label='Message' />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
