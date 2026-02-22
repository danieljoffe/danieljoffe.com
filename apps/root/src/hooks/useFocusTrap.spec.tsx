import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap } from './useFocusTrap';

function TestComponent({ isActive }: { isActive: boolean }) {
  const containerRef = useFocusTrap(isActive);

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>}>
      <button>First</button>
      <button>Second</button>
      <button>Third</button>
    </div>
  );
}

describe('useFocusTrap', () => {
  it('focuses the first focusable element when active', () => {
    render(<TestComponent isActive={true} />);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'First' })
    );
  });

  it('does not focus anything when inactive', () => {
    render(<TestComponent isActive={false} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('wraps focus from last to first on Tab', async () => {
    const user = userEvent.setup();
    render(<TestComponent isActive={true} />);

    // Focus starts on First, tab to Second, Third
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Second' })
    );
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Third' })
    );
    // Tab from Third should wrap to First
    await user.tab();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'First' })
    );
  });

  it('wraps focus from first to last on Shift+Tab', async () => {
    const user = userEvent.setup();
    render(<TestComponent isActive={true} />);

    // Focus starts on First. Shift+Tab should wrap to Third
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Third' })
    );
  });

  it('handles Escape key to restore focus to previously focused element', async () => {
    const user = userEvent.setup();
    // Create a button that was "previously focused"
    render(
      <>
        <button data-previously-focused>Opener</button>
        <TestComponent isActive={true} />
      </>
    );

    await user.keyboard('{Escape}');

    // After Escape, the opener gets focus and the attribute is removed
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Opener' })
    );
  });

  it('cleans up event listeners when deactivated', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const { rerender } = render(<TestComponent isActive={true} />);

    // Should have added keydown listeners
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    rerender(<TestComponent isActive={false} />);

    // Should have removed keydown listeners
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
