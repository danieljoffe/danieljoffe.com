import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GlobalProvider from './Provider';
import { useGlobal } from './Context';

// Mock useWindowResize to control breakpoint values
const mockWindowResize = {
  windowWidth: 1024,
  windowHeight: 768,
  isMobile: false,
  isTablet: false,
  isDesktop: true,
};

jest.mock('@/hooks/useWindowResize', () => ({
  useWindowResize: () => mockWindowResize,
}));

function TestConsumer() {
  const ctx = useGlobal();
  return (
    <div>
      <span data-testid='isDarkMode'>{String(ctx.isDarkMode)}</span>
      <span data-testid='themeMode'>{ctx.themeMode}</span>
      <span data-testid='isModalOpen'>{String(ctx.isModalOpen)}</span>
      <span data-testid='isMobile'>{String(ctx.isMobile)}</span>
      <span data-testid='isDesktop'>{String(ctx.isDesktop)}</span>
      <button onClick={ctx.toggleDarkMode}>Toggle Dark</button>
      <button onClick={ctx.toggleModal}>Toggle Modal</button>
      <button onClick={() => ctx.setModalContent(<p>Modal!</p>)}>
        Set Modal Content
      </button>
      <button onClick={() => ctx.setModalContent(null)}>
        Clear Modal Content
      </button>
      <button onClick={() => ctx.setThemeMode('light')}>Set Light</button>
      <button onClick={() => ctx.setThemeMode('dark')}>Set Dark</button>
      {ctx.modalContent}
    </div>
  );
}

describe('GlobalProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('overflow-y-hidden');
    // Reset to desktop
    mockWindowResize.isMobile = false;
    mockWindowResize.isDesktop = true;
  });

  it('provides window size from useWindowResize', () => {
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );
    expect(screen.getByTestId('isDesktop')).toHaveTextContent('true');
    expect(screen.getByTestId('isMobile')).toHaveTextContent('false');
  });

  it('defaults to system theme mode', () => {
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );
    expect(screen.getByTestId('themeMode')).toHaveTextContent('system');
  });

  it('toggles dark mode and persists to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    // Initially not dark (system=false from matchMedia mock)
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('false');

    await user.click(screen.getByText('Toggle Dark'));
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('true');
    expect(localStorage.getItem('theme-mode')).toBe('dark');

    // Toggle back
    await user.click(screen.getByText('Toggle Dark'));
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('false');
    expect(localStorage.getItem('theme-mode')).toBe('light');
  });

  it('applies dark class to document element when dark mode', async () => {
    const user = userEvent.setup();
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    await user.click(screen.getByText('Toggle Dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    await user.click(screen.getByText('Toggle Dark'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('sets theme mode explicitly', async () => {
    const user = userEvent.setup();
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    await user.click(screen.getByText('Set Dark'));
    expect(screen.getByTestId('themeMode')).toHaveTextContent('dark');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('true');

    await user.click(screen.getByText('Set Light'));
    expect(screen.getByTestId('themeMode')).toHaveTextContent('light');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('false');
  });

  it('toggles modal open/closed', async () => {
    const user = userEvent.setup();
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');

    await user.click(screen.getByText('Toggle Modal'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('true');

    await user.click(screen.getByText('Toggle Modal'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
  });

  it('sets modal content and opens modal', async () => {
    const user = userEvent.setup();
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    await user.click(screen.getByText('Set Modal Content'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('true');
    expect(screen.getByText('Modal!')).toBeInTheDocument();
  });

  it('clears modal content and closes modal', async () => {
    const user = userEvent.setup();
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    await user.click(screen.getByText('Set Modal Content'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('true');

    await user.click(screen.getByText('Clear Modal Content'));
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
  });

  it('adds overflow-y-hidden to body when modal opens', async () => {
    const user = userEvent.setup();
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    await user.click(screen.getByText('Toggle Modal'));
    expect(document.body.classList.contains('overflow-y-hidden')).toBe(true);

    await user.click(screen.getByText('Toggle Modal'));
    expect(document.body.classList.contains('overflow-y-hidden')).toBe(false);
  });

  it('reads stored theme from localStorage on mount', async () => {
    localStorage.setItem('theme-mode', 'dark');
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    // Wait for the queueMicrotask in the useEffect to fire
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('themeMode')).toHaveTextContent('dark');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('true');
  });

  it('falls back to system when localStorage has invalid value', async () => {
    localStorage.setItem('theme-mode', 'invalid');
    render(
      <GlobalProvider>
        <TestConsumer />
      </GlobalProvider>
    );

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(screen.getByTestId('themeMode')).toHaveTextContent('system');
  });
});
