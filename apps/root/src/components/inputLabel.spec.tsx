import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InputLabel from './InputLabel';

describe('InputLabel', () => {
  test('renders label text and htmlFor', () => {
    render(<InputLabel inputId='email' label='Email' />);
    const label = screen.getByText('Email');
    expect(label.tagName.toLowerCase()).toBe('label');
    expect(label).toHaveAttribute('for', 'email');
  });

  test('shows required indicator with a11y label when required', () => {
    render(<InputLabel inputId='name' label='Name' required />);
    const star = screen.getByLabelText('required field');
    expect(star).toBeInTheDocument();
    expect(star).toHaveTextContent('*');
  });

  test('does not render required indicator when not required', () => {
    render(<InputLabel inputId='age' label='Age' />);
    expect(screen.queryByLabelText('required field')).toBeNull();
  });

  test('clicking the label focuses the associated input if present', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <InputLabel inputId='username' label='Username' />
        <input id='username' />
      </div>
    );
    const label = screen.getByText('Username');
    const input = screen.getByRole('textbox');
    await user.click(label);
    expect(input).toHaveFocus();
  });

  test('applies base styling classes', () => {
    render(<InputLabel inputId='city' label='City' />);
    const label = screen.getByText('City');
    expect(label.className).toContain('block');
    expect(label.className).toContain('text-base');
    expect(label.className).toContain('font-sans');
  });
});
