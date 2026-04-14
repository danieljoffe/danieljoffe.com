import { render, screen, fireEvent } from '@testing-library/react';
import ModalProvider, { useModal } from '../ModalProvider';

function TestConsumer() {
  const { isModalOpen, toggleModal, modalContent, setModalContent } =
    useModal();
  return (
    <div>
      <span data-testid='open'>{String(isModalOpen)}</span>
      <span data-testid='content'>{modalContent}</span>
      <button name='toggle' onClick={toggleModal}>
        Toggle
      </button>
      <button name='set' onClick={() => setModalContent(<p>Hello</p>)}>
        Set
      </button>
      <button name='clear' onClick={() => setModalContent(null)}>
        Clear
      </button>
    </div>
  );
}

describe('ModalProvider', () => {
  beforeEach(() => {
    document.body.classList.remove('overflow-y-hidden');
  });

  it('provides default context values', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );

    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });

  it('toggles modal open state', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('open')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });

  it('sets modal content and opens the modal', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(screen.getByTestId('open')).toHaveTextContent('true');
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('clears modal content and closes the modal', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(screen.getByTestId('open')).toHaveTextContent('true');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByTestId('open')).toHaveTextContent('false');
  });

  it('syncs body overflow with modal state', () => {
    render(
      <ModalProvider>
        <TestConsumer />
      </ModalProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(document.body.classList.contains('overflow-y-hidden')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(document.body.classList.contains('overflow-y-hidden')).toBe(false);
  });
});
