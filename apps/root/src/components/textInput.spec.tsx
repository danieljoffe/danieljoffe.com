import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextInput from './TextInput';

describe('TextInput', () => {
  test('renders input with label and required attributes', () => {
    render(<TextInput label='Email' name='email' required />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Email', { exact: false });
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', input.getAttribute('id'));
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-required', 'true');
  });

  test('shows required indicator in label', () => {
    render(<TextInput label='Email' name='email' required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  test('applies disabled state and disables the control', async () => {
    const user = userEvent.setup();
    render(<TextInput label='Username' name='username' disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    await user.click(input);
    expect(input).not.toHaveFocus();
  });

  test('sets aria-invalid and describes by error id when error is present', () => {
    render(<TextInput label='Name' name='name' error='Required' />);
    const input = screen.getByRole('textbox');
    const feedback = screen.getByRole('alert');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(feedback).toHaveTextContent('Required');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(feedback.getAttribute('id')).toEqual(describedBy as string);
  });

  test('when hint provided, aria-describedby points to helper id', () => {
    render(<TextInput label='City' name='city' hint='Optional' />);
    const input = screen.getByRole('textbox');
    const helper = screen.getByText('Optional');
    expect(helper).toBeInTheDocument();
    const describedBy = input.getAttribute('aria-describedby');
    expect(helper.getAttribute('id')).toEqual(describedBy as string);
  });

  test('applies success state classes when success is true and no error', () => {
    render(<TextInput label='Zip' name='zip' success />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain('border-success');
  });

  test('renders textarea when as="textarea"', () => {
    render(<TextInput label='Bio' name='bio' as='textarea' />);
    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
  });

  test('uses provided id when given', () => {
    render(<TextInput label='First Name' id='custom-id' />);
    const input = screen.getByRole('textbox');
    expect(input.getAttribute('id')).toBe('custom-id');
  });

  test('logs in dev when no label and no aria-label (does not throw)', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const logSpy = jest.spyOn(console, 'log').mockImplementation(jest.fn());
    render(<TextInput name='nolabel' />);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
