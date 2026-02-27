import React from 'react';
import { render, screen } from '@testing-library/react';
import { GlobalState, GlobalContext, useGlobal } from '../Context';

function TestConsumer() {
  const ctx = useGlobal();
  return (
    <div>
      <span data-testid='isModalOpen'>{String(ctx.isModalOpen)}</span>
      <span data-testid='themeMode'>{ctx.themeMode}</span>
      <span data-testid='isDarkMode'>{String(ctx.isDarkMode)}</span>
      <span data-testid='isMobile'>{String(ctx.isMobile)}</span>
      <span data-testid='windowWidth'>{ctx.windowWidth}</span>
    </div>
  );
}

describe('GlobalState', () => {
  it('has the expected default shape', () => {
    expect(GlobalState).toEqual(
      expect.objectContaining({
        windowWidth: 400,
        windowHeight: 600,
        isMobile: true,
        isTablet: false,
        isDesktop: false,
        isModalOpen: false,
        modalContent: null,
        themeMode: 'system',
        isDarkMode: false,
      })
    );
  });

  it('has noop functions for toggleModal, setModalContent, setThemeMode, toggleDarkMode', () => {
    expect(typeof GlobalState.toggleModal).toBe('function');
    expect(typeof GlobalState.setModalContent).toBe('function');
    expect(typeof GlobalState.setThemeMode).toBe('function');
    expect(typeof GlobalState.toggleDarkMode).toBe('function');

    // Noop functions return undefined and don't throw
    expect(GlobalState.toggleModal()).toBeUndefined();
    expect(GlobalState.setModalContent(<div />)).toBeUndefined();
    expect(GlobalState.setThemeMode('dark')).toBeUndefined();
    expect(GlobalState.toggleDarkMode()).toBeUndefined();
  });
});

describe('useGlobal', () => {
  it('returns context value when used within a provider', () => {
    const customValue = {
      ...GlobalState,
      windowWidth: 1920,
      isDarkMode: true,
      themeMode: 'dark' as const,
    };

    render(
      <GlobalContext.Provider value={customValue}>
        <TestConsumer />
      </GlobalContext.Provider>
    );

    expect(screen.getByTestId('windowWidth')).toHaveTextContent('1920');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('true');
    expect(screen.getByTestId('themeMode')).toHaveTextContent('dark');
  });

  it('returns default state when used without a provider', () => {
    render(<TestConsumer />);

    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('themeMode')).toHaveTextContent('system');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('false');
    expect(screen.getByTestId('isMobile')).toHaveTextContent('true');
    expect(screen.getByTestId('windowWidth')).toHaveTextContent('400');
  });
});
