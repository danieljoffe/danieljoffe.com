import { render, screen, fireEvent, act } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Modal } from './Modal';

expect.extend(toHaveNoViolations);

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

  it('does not call onClose on backdrop click when closeOnBackdropClick is false', () => {
    const handleClose = jest.fn();
    renderModal({ onClose: handleClose, closeOnBackdropClick: false });

    const backdrop = document.querySelector('[aria-hidden="true"]');
    fireEvent.click(backdrop!);

    expect(handleClose).not.toHaveBeenCalled();
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

  describe('placement', () => {
    it('centers the dialog by default', () => {
      renderModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('rounded-lg');
      expect(dialog.parentElement).toHaveClass('items-center');
    });

    it('anchors the dialog to the bottom as a sheet', () => {
      renderModal({ placement: 'sheet' });
      const dialog = screen.getByRole('dialog');
      expect(dialog.parentElement).toHaveClass('items-end');
      expect(dialog).toHaveClass('rounded-t-lg');
      expect(dialog).toHaveClass('max-h-[85dvh]');
      expect(dialog).not.toHaveClass('rounded-lg');
    });

    it('animates the sheet in with sheet-in, disabled under reduced motion', () => {
      renderModal({ placement: 'sheet' });
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('animate-sheet-in');
      expect(dialog).toHaveClass('motion-reduce:animate-none');
    });

    it('sheet placement has no accessibility violations', async () => {
      const { container } = renderModal({
        placement: 'sheet',
        title: 'Sheet',
      });
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  describe('sheet exit animation', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    const sheet = (isOpen: boolean) => (
      <Modal isOpen={isOpen} onClose={() => {}} placement='sheet'>
        <button>OK</button>
      </Modal>
    );

    it('keeps the sheet mounted and inert while it slides out, then unmounts', () => {
      const { rerender } = render(sheet(true));
      rerender(sheet(false));

      const dialog = screen.getByRole('dialog', { hidden: true });
      expect(dialog).toHaveClass('animate-sheet-out');
      expect(dialog).toHaveAttribute('inert');
      // Dismissal is not interactive during the exit
      expect(dialog.parentElement).toHaveClass('pointer-events-none');

      act(() => {
        jest.advanceTimersByTime(250);
      });
      expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    });

    it('removes the backdrop at close-start, before the sheet finishes exiting', () => {
      const { rerender, container } = render(sheet(true));
      expect(container.querySelector('.backdrop-blur-sm')).toBeInTheDocument();
      rerender(sheet(false));
      expect(container.querySelector('.backdrop-blur-sm')).toBeNull();
      expect(screen.getByRole('dialog', { hidden: true })).toBeInTheDocument();
    });

    it('reopening during the exit renders the sheet as open again', () => {
      const { rerender } = render(sheet(true));
      rerender(sheet(false));
      rerender(sheet(true));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('animate-sheet-in');
      expect(dialog).not.toHaveAttribute('inert');
      // Outlive the (cleared) exit timer: the sheet must remain open
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes centered dialogs instantly (no exit phase)', () => {
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
      expect(screen.queryByRole('dialog', { hidden: true })).toBeNull();
    });
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
    expect(container.querySelector('.bg-surface-elevated')).toBeInTheDocument();
  });

  it('shows close button when no title is provided', () => {
    renderModal();
    expect(
      screen.getByRole('button', { name: 'Close dialog' })
    ).toBeInTheDocument();
  });

  it('hides the close button with showCloseButton={false} (no title)', () => {
    renderModal({ showCloseButton: false, 'aria-label': 'Sheet' });
    expect(
      screen.queryByRole('button', { name: 'Close dialog' })
    ).not.toBeInTheDocument();
  });

  it('hides the close button with showCloseButton={false} (with title)', () => {
    renderModal({ showCloseButton: false, title: 'Sheet' });
    expect(screen.getByText('Sheet')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Close dialog' })
    ).not.toBeInTheDocument();
  });

  it('merges bodyClassName onto the scrollable body', () => {
    renderModal({ bodyClassName: 'px-6 py-5' });
    const body = screen.getByText('OK').parentElement;
    expect(body).toHaveClass('px-6', 'py-5', 'overflow-y-auto');
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

    it('uses the aria-label prop over the "Dialog" fallback when no title', () => {
      renderModal({ 'aria-label': 'Table of contents' });
      expect(
        screen.getByRole('dialog', { name: 'Table of contents' })
      ).toBeInTheDocument();
    });

    it('title wins over the aria-label prop', () => {
      renderModal({ title: 'My Dialog', 'aria-label': 'Ignored' });
      const dialog = screen.getByRole('dialog', { name: 'My Dialog' });
      expect(dialog).not.toHaveAttribute('aria-label');
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

  it('has no accessibility violations', async () => {
    const { container } = renderModal({ title: 'Test Dialog' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
