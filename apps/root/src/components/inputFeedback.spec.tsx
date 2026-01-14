import React from 'react';
import { render, screen } from '@testing-library/react';
import InputFeedback from './InputFeedback';

describe('InputFeedback', () => {
  test('does not render when message is empty', () => {
    const { container, rerender } = render(
      <InputFeedback inputId='field' message='' type='hint' />
    );
    expect(container.firstChild).toBeNull();
    rerender(
      <InputFeedback
        inputId='field'
        message={'' as unknown as string}
        type='error'
      />
    );
    expect(container.firstChild).toBeNull();
  });

  test('renders as status for hint and success with aria-live polite', () => {
    render(
      <InputFeedback inputId='name' message='Looks good' type='success' />
    );
    const node = screen.getByRole('status');
    expect(node).toHaveAttribute('aria-live', 'polite');
    expect(node).toHaveAttribute('aria-atomic', 'true');
    expect(node.id).toBe('name-success');
    expect(node).toHaveTextContent('Looks good');
  });

  test('renders as alert for error with aria-live assertive', () => {
    render(<InputFeedback inputId='email' message='Required' type='error' />);
    const node = screen.getByRole('alert');
    expect(node).toHaveAttribute('aria-live', 'assertive');
    expect(node).toHaveAttribute('aria-atomic', 'true');
    expect(node.id).toBe('email-error');
    expect(node).toHaveTextContent('Required');
  });
});
