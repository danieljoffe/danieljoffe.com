import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalProvider from '../Provider';
import { useGlobal } from '../Context';

// Mock useWindowResize
jest.mock('@/hooks/useWindowResize', () => ({
  useWindowResize: () => ({
    windowWidth: 1024,
    windowHeight: 768,
    isMobile: false,
    isTablet: false,
    isDesktop: true,
  }),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Test consumer component that displays context values and exposes actions
function TestConsumer() {
  const ctx = useGlobal();

  return (
    <div>
      <span data-testid='isModalOpen'>{String(ctx.isModalOpen)}</span>
      <span data-testid='modalContent'>
        {ctx.modalContent ? 'has-content' : 'no-content'}
      </span>
      <span data-testid='themeMode'>{ctx.themeMode}</span>
      <span data-testid='isDarkMode'>{String(ctx.isDarkMode)}</span>
      <span data-testid='windowWidth'>{ctx.windowWidth}</span>
      <span data-testid='windowHeight'>{ctx.windowHeight}</span>
      <span data-testid='isMobile'>{String(ctx.isMobile)}</span>
      <span data-testid='isDesktop'>{String(ctx.isDesktop)}</span>
      <button data-testid='toggleModal' onClick={ctx.toggleModal}>
        Toggle Modal
      </button>
      <button
        data-testid='setModalContent'
        onClick={() => ctx.setModalContent(<div>Modal!</div>)}
      >
        Set Content
      </button>
      <button
        data-testid='clearModalContent'
        onClick={() => ctx.setModalContent(null)}
      >
        Clear Content
      </button>
    </div>
  );
}

beforeEach(() => {
  localStorageMock.clear();
  jest.clearAllMocks();
  document.documentElement.classList.remove('dark');
});

describe('GlobalProvider', () => {
  it('renders children', () => {
    render(
      <GlobalProvider>
        <div data-testid='child'>Hello</div>
      </GlobalProvider>
    );

    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides default context values', async () => {
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    // Wait for microtask from useEffect to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('themeMode')).toHaveTextContent('system');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('false');
    expect(screen.getByTestId('windowWidth')).toHaveTextContent('1024');
    expect(screen.getByTestId('windowHeight')).toHaveTextContent('768');
    expect(screen.getByTestId('isMobile')).toHaveTextContent('false');
    expect(screen.getByTestId('isDesktop')).toHaveTextContent('true');
  });

  it('toggleModal updates isModalOpen', async () => {
    const user = userEvent.setup();

    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');

    await user.click(screen.getByTestId('toggleModal'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('true');

    await user.click(screen.getByTestId('toggleModal'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
  });

  it('setModalContent updates modalContent and opens modal', async () => {
    const user = userEvent.setup();

    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('modalContent')).toHaveTextContent('no-content');

    await user.click(screen.getByTestId('setModalContent'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('true');
    expect(screen.getByTestId('modalContent')).toHaveTextContent('has-content');
  });

  it('setModalContent with null closes modal', async () => {
    const user = userEvent.setup();

    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    // Open modal first
    await user.click(screen.getByTestId('setModalContent'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('true');

    // Clear content closes modal
    await user.click(screen.getByTestId('clearModalContent'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('modalContent')).toHaveTextContent('no-content');
  });

  it('reads theme mode from localStorage on mount', async () => {
    localStorageMock.getItem.mockReturnValue('dark');

    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    // Wait for microtask from useEffect to settle
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('themeMode')).toHaveTextContent('dark');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('true');
  });
});
