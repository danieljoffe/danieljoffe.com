import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextInput from './TextInput';
import {
  stateStyles,
  textAreaBaseStyles,
  baseStyles,
} from './textInput.constants';

describe('TextInput', () => {
  test('renders input with label and required attributes', () => {
    render(<TextInput label='Email' name='email' required />);
    const input = screen.getByRole('textbox');
    const label = screen.getByText('Email');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', input.getAttribute('id'));
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('aria-required', 'true');
    // base styles applied for input
    expect(input.className).toContain(baseStyles.split(' ')[0]);
  });

  test('applies disabled state styles and disables the control', async () => {
    const user = userEvent.setup();
    render(<TextInput label='Username' name='username' disabled />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    expect(input.className).toContain(stateStyles.disabled.split(' ')[0]);
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
    // Feedback id should match pattern `${inputId}-error`
    expect(feedback.getAttribute('id')).toEqual(describedBy as string);
  });

  test('when hint provided, aria-describedby points to hint id', () => {
    render(<TextInput label='City' name='city' hint='Optional' />);
    const input = screen.getByRole('textbox');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Optional');
    const describedBy = input.getAttribute('aria-describedby');
    expect(status.getAttribute('id')).toEqual(describedBy as string);
  });

  test('applies success state styles when success is true and no error', () => {
    render(<TextInput label='Zip' name='zip' success />);
    const input = screen.getByRole('textbox');
    expect(input.className).toContain(stateStyles.success.split(' ')[0]);
  });

  test('renders textarea when as="textarea"', () => {
    render(<TextInput label='Bio' name='bio' as='textarea' />);
    const textarea = screen.getByRole('textbox');
    // textareas are also role="textbox"
    expect(textarea.tagName.toLowerCase()).toBe('textarea');
    expect(textarea.className).toContain(textAreaBaseStyles.split(' ')[0]);
  });

  test('id composition uses name prefix when provided', () => {
    render(<TextInput label='First Name' name='first' />);
    const input = screen.getByRole('textbox');
    const id = input.getAttribute('id') as string;
    expect(id.startsWith('first-')).toBe(true);
  });

  test('warns in dev when no label and no aria-label (does not throw)', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(jest.fn());
    render(<TextInput name='nolabel' />);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });
});
