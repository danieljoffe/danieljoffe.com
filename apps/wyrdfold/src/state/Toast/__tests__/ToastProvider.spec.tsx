import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

function ToastTrigger({ title }: { title: string }) {
  const { toast } = useToast();
  return (
    <button type='button' onClick={() => toast({ variant: 'error', title })}>
      Trigger
    </button>
  );
}

describe('ToastProvider — accessibility', () => {
  it('exposes the live region as role="status" with aria-live="polite"', () => {
    render(
      <ToastProvider>
        <div>child</div>
      </ToastProvider>
    );
    // The live region exists even when no toasts are present so screen
    // readers attach a listener before the first announcement.
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'false');
  });

  it('renders toast titles inside the live region so they get announced', () => {
    render(
      <ToastProvider>
        <ToastTrigger title='No experience profile found' />
      </ToastProvider>
    );

    act(() => {
      screen.getByText('Trigger').click();
    });

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toHaveTextContent('No experience profile found');
  });
});
