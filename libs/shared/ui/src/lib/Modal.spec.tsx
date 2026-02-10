import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders nothing when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}}>
        Modal content
      </Modal>
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders children when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        Modal content
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title='Test Title'>
        Content
      </Modal>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('renders footer when provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} footer={<button>Save</button>}>
        Content
      </Modal>
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Content
      </Modal>
    );

    const backdrop = document.querySelector('.bg-background\\/80');
    fireEvent.click(backdrop!);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked with title', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title='Title'>
        Content
      </Modal>
    );

    const closeButtons = screen.getAllByRole('button');
    fireEvent.click(closeButtons[0]);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Content
      </Modal>
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies sm size styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} size='sm'>
        Content
      </Modal>
    );
    expect(container.querySelector('.max-w-md')).toBeInTheDocument();
  });

  it('applies md size styles by default', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}}>
        Content
      </Modal>
    );
    expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
  });

  it('applies lg size styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} size='lg'>
        Content
      </Modal>
    );
    expect(container.querySelector('.max-w-2xl')).toBeInTheDocument();
  });

  it('applies xl size styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} size='xl'>
        Content
      </Modal>
    );
    expect(container.querySelector('.max-w-4xl')).toBeInTheDocument();
  });

  it('applies default variant styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}}>
        Content
      </Modal>
    );
    expect(
      container.querySelector('.bg-background-elevated')
    ).toBeInTheDocument();
  });

  it('applies accent variant styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} variant='accent'>
        Content
      </Modal>
    );
    expect(container.querySelector('.border-l-accent')).toBeInTheDocument();
  });

  it('applies success variant styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} variant='success'>
        Content
      </Modal>
    );
    expect(container.querySelector('.border-l-success')).toBeInTheDocument();
  });

  it('applies warning variant styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} variant='warning'>
        Content
      </Modal>
    );
    expect(container.querySelector('.border-l-warning')).toBeInTheDocument();
  });

  it('applies error variant styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} variant='error'>
        Content
      </Modal>
    );
    expect(container.querySelector('.border-l-error')).toBeInTheDocument();
  });

  it('shows close button when no title is provided', () => {
    render(
      <Modal isOpen={true} onClose={() => {}}>
        Content
      </Modal>
    );
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('applies info variant styles', () => {
    const { container } = render(
      <Modal isOpen={true} onClose={() => {}} variant='info'>
        Content
      </Modal>
    );
    expect(container.querySelector('.border-l-info')).toBeInTheDocument();
  });

  describe('body scroll cleanup', () => {
    afterEach(() => {
      document.body.style.overflow = '';
    });

    it('locks body scroll when open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      );
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      );
      rerender(
        <Modal isOpen={false} onClose={() => {}}>
          Content
        </Modal>
      );
      expect(document.body.style.overflow).toBe('unset');
    });

    it('restores body scroll on unmount', () => {
      const { unmount } = render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      );
      unmount();
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('ARIA dialog', () => {
    it('has role="dialog" and aria-modal', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby when title is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title='My Dialog'>
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();
      expect(screen.getByText('My Dialog')).toHaveAttribute('id', labelledBy);
    });

    it('has aria-label="Dialog" when no title', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label', 'Dialog');
    });

    it('close button has accessible name "Close dialog"', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title='Test'>
          Content
        </Modal>
      );
      expect(
        screen.getByRole('button', { name: 'Close dialog' })
      ).toBeInTheDocument();
    });

    it('close button is accessible when no title is provided', () => {
      render(
        <Modal isOpen={true} onClose={() => {}}>
          Content
        </Modal>
      );
      expect(
        screen.getByRole('button', { name: 'Close dialog' })
      ).toBeInTheDocument();
    });
  });
});
