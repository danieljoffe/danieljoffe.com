import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

// Helper that provides a tabbable node for focus-trap
const renderModal = (props: Partial<React.ComponentProps<typeof Modal>> = {}) =>
  render(
    <Modal isOpen={true} onClose={() => {}} {...props}>
      <button>OK</button>
    </Modal>
  );

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        <button>OK</button>
      </Modal>
    );
    expect(screen.queryByText('OK')).not.toBeInTheDocument();
  });

  it('renders children when isOpen is true', () => {
    renderModal();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    renderModal({ title: 'Test Title' });
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    renderModal({ footer: <button>Save</button> });
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = jest.fn();
    renderModal({ onClose: handleClose });

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked with title', () => {
    const handleClose = jest.fn();
    renderModal({ onClose: handleClose, title: 'Title' });

    const closeButton = screen.getByRole('button', { name: 'Close dialog' });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = jest.fn();
    renderModal({ onClose: handleClose });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies sm size styles', () => {
    const { container } = renderModal({ size: 'sm' });
    expect(container.querySelector('.max-w-md')).toBeInTheDocument();
  });

  it('applies md size styles by default', () => {
    const { container } = renderModal();
    expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
  });

  it('applies lg size styles', () => {
    const { container } = renderModal({ size: 'lg' });
    expect(container.querySelector('.max-w-2xl')).toBeInTheDocument();
  });

  it('applies xl size styles', () => {
    const { container } = renderModal({ size: 'xl' });
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    const { container } = renderModal();
    expect(
      container.querySelector('.bg-background-elevated')
    ).toBeInTheDocument();
  });

  it('applies accent variant styles', () => {
    const { container } = renderModal({ variant: 'accent' });
    expect(container.querySelector('.border-l-accent')).toBeInTheDocument();
  });

  it('applies success variant styles', () => {
    const { container } = renderModal({ variant: 'success' });
    expect(container.querySelector('.border-l-success')).toBeInTheDocument();
  });

  it('applies warning variant styles', () => {
    const { container } = renderModal({ variant: 'warning' });
    expect(container.querySelector('.border-l-warning')).toBeInTheDocument();
  });

  it('applies error variant styles', () => {
    const { container } = renderModal({ variant: 'error' });
    expect(container.querySelector('.border-l-error')).toBeInTheDocument();
  });

  it('shows close button when no title is provided', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: 'Close dialog' })
    ).toBeInTheDocument();
  });

  it('applies info variant styles', () => {
    const { container } = renderModal({ variant: 'info' });
    expect(container.querySelector('.border-l-info')).toBeInTheDocument();
  });

  describe('body scroll cleanup', () => {
    afterEach(() => {
      document.body.style.overflow = '';
    });

    it('locks body scroll when open', () => {
      renderModal();
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          <button>OK</button>
        </Modal>
      );
      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          <button>OK</button>
        </Modal>
      );
      expect(document.body.style.overflow).toBe('');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = renderModal();
      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('ARIA dialog', () => {
    it('has role="dialog" and aria-modal', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby when title is provided', () => {
      renderModal({ title: 'My Dialog' });
      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(screen.getByText('My Dialog')).toHaveAttribute('id', labelledBy);
    });

    it('has aria-label="Dialog" when no title', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Dialog');
    });

    it('close button has accessible name "Close dialog"', () => {
      renderModal({ title: 'Test' });
      expect(
        screen.getByRole('button', { name: 'Close dialog' })
      ).toBeInTheDocument();
    });

    it('close button is accessible when no title is provided', () => {
      renderModal();
      expect(
        screen.getByRole('button', { name: 'Close dialog' })
      ).toBeInTheDocument();
    });
  });
});
