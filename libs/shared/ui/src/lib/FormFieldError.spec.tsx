import { render, screen } from '@testing-library/react';
import { FormFieldError } from './FormFieldError';

describe('FormFieldError', () => {
  it('renders nothing when no message is provided', () => {
    const { container } = render(<FormFieldError />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when message is an empty string', () => {
    const { container } = render(<FormFieldError message='' />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the message text when provided', () => {
    render(<FormFieldError message='Email is required' />);
    expect(screen.getByText('Email is required')).toBeInTheDocument();
  });

  it('applies the id attribute when provided so inputs can aria-describedby it', () => {
    render(<FormFieldError message='Invalid email' id='email-error' />);
    expect(screen.getByText('Invalid email')).toHaveAttribute(
      'id',
      'email-error'
    );
  });
});
