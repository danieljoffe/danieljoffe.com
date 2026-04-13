import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../ToastProvider';

jest.useFakeTimers();

function TestConsumer() {
  const { toast } = useToast();
  return (
    <div>
      <button
        name='success'
        onClick={() => toast({ variant: 'success', title: 'Saved!' })}
      >
        Success
      </button>
      <button
        name='error'
        onClick={() =>
          toast({
            variant: 'error',
            title: 'Failed',
            description: 'Something broke',
          })
        }
      >
        Error
      </button>
    </div>
  );
}

describe('ToastProvider', () => {
  it('renders children', () => {
    render(
      <ToastProvider>
        <p>Content</p>
      </ToastProvider>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows a toast when triggered', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('shows toast with description', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Error' }));
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Something broke')).toBeInTheDocument();
  });

  it('auto-dismisses toast after 4 seconds', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('dismisses toast when X button is clicked', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    // The dismiss button is the X icon button inside the toast
    const dismissButtons = screen.getAllByRole('button');
    const dismissBtn = dismissButtons.find(
      btn =>
        btn !== screen.getByRole('button', { name: 'Success' }) &&
        btn !== screen.getByRole('button', { name: 'Error' })
    );
    expect(dismissBtn).toBeDefined();
    fireEvent.click(dismissBtn!);

    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('supports multiple simultaneous toasts', () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Success' }));
    fireEvent.click(screen.getByRole('button', { name: 'Error' }));

    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
