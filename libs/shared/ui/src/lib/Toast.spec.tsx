import { render, screen, fireEvent, act } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

function ToastTrigger() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast({ variant: 'success', title: 'Saved!' })}>
        Success
      </button>
      <button
        onClick={() =>
          toast({
            variant: 'error',
            title: 'Failed',
            description: 'Something went wrong',
          })
        }
      >
        Error
      </button>
    </div>
  );
}

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing initially', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('shows toast when triggered', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('shows toast with description', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Error'));
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('auto-dismisses after 4 seconds', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('dismisses when close button is clicked', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByText('Saved!')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button').filter(btn => {
      const svg = btn.querySelector('svg');
      return svg && btn.closest('.animate-slide-up');
    });
    fireEvent.click(closeButtons[0]);

    expect(screen.queryByText('Saved!')).not.toBeInTheDocument();
  });

  it('can show multiple toasts', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Success'));
    fireEvent.click(screen.getByText('Error'));

    expect(screen.getByText('Saved!')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <ToastProvider>
        <div>App Content</div>
      </ToastProvider>
    );
    expect(screen.getByText('App Content')).toBeInTheDocument();
  });
});
