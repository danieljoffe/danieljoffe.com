import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ToastProvider, useToast } from './Toast';

expect.extend(toHaveNoViolations);

function ToastTrigger() {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast({ variant: 'success', title: 'Saved!' })}>
        Success
      </button>
      <button onClick={() => toast({ variant: 'info', title: 'Heads up' })}>
        Info
      </button>
      <button onClick={() => toast({ variant: 'warning', title: 'Watch out' })}>
        Warning
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
      jest.advanceTimersByTime(4150);
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

    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' })
    );

    act(() => {
      jest.advanceTimersByTime(150);
    });

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

  // --- Accessibility: aria-live region ---

  it('toast container has aria-live="polite"', () => {
    const { container } = render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>
    );
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toBeInTheDocument();
  });

  it('toast container has aria-atomic="true"', () => {
    const { container } = render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>
    );
    const region = container.querySelector('[aria-live="polite"]');
    expect(region).toHaveAttribute('aria-atomic', 'true');
  });

  // --- Accessibility: role per variant ---

  it('info toast has role="status"', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('success toast has role="status"', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Success'));
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('error toast has role="alert"', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Error'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('warning toast has role="alert"', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Warning'));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // --- Accessibility: aria-atomic on individual toast ---

  it('individual toast has aria-atomic="true"', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Info'));
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });

  // --- Accessibility: close button label ---

  it('close button has aria-label="Dismiss notification"', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Info'));
    expect(
      screen.getByRole('button', { name: 'Dismiss notification' })
    ).toBeInTheDocument();
  });

  // --- Pause on hover ---

  it('pauses auto-dismiss on mouse hover and resumes on leave', () => {
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Info'));
    const toast = screen.getByRole('status');

    // Advance partway through the timeout
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Hover to pause
    fireEvent.mouseEnter(toast);

    // Advance well past the original timeout
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Toast should still be visible because hover paused the timer
    expect(screen.getByText('Heads up')).toBeInTheDocument();

    // Mouse leave to resume
    fireEvent.mouseLeave(toast);

    // Advance the remaining time (~2000ms) plus 150ms dismiss animation
    act(() => {
      jest.advanceTimersByTime(2150);
    });

    expect(screen.queryByText('Heads up')).not.toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    jest.useRealTimers();
    const { container } = render(
      <ToastProvider>
        <div>App</div>
      </ToastProvider>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
