import React from 'react';
import { render, screen } from '@testing-library/react';
import { GlobalContext, GlobalState, useGlobal } from './Context';

function TestConsumer() {
  const ctx = useGlobal();
  return (
    <div>
      <span data-testid='isMobile'>{String(ctx.isMobile)}</span>
      <span data-testid='isDarkMode'>{String(ctx.isDarkMode)}</span>
      <span data-testid='isModalOpen'>{String(ctx.isModalOpen)}</span>
      <span data-testid='themeMode'>{ctx.themeMode}</span>
    </div>
  );
}

describe('GlobalContext', () => {
  it('provides default values when no provider wraps the consumer', () => {
    render(<TestConsumer />);
    expect(screen.getByTestId('isMobile')).toHaveTextContent('true');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('false');
    expect(screen.getByTestId('isModalOpen')).toHaveTextContent('false');
    expect(screen.getByTestId('themeMode')).toHaveTextContent('system');
  });

  it('provides custom values when wrapped with a provider', () => {
    const customValue = {
      ...GlobalState,
      isMobile: false,
      isDesktop: true,
      isDarkMode: true,
      themeMode: 'dark' as const,
    };

    render(
      <GlobalContext.Provider value={customValue}>
        <TestConsumer />
      </GlobalContext.Provider>
    );

    expect(screen.getByTestId('isMobile')).toHaveTextContent('false');
    expect(screen.getByTestId('isDarkMode')).toHaveTextContent('true');
    expect(screen.getByTestId('themeMode')).toHaveTextContent('dark');
  });

  it('GlobalState has correct default shape', () => {
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
    expect(typeof GlobalState.toggleModal).toBe('function');
    expect(typeof GlobalState.setModalContent).toBe('function');
    expect(typeof GlobalState.setThemeMode).toBe('function');
    expect(typeof GlobalState.toggleDarkMode).toBe('function');
  });

  it('noop functions return undefined', () => {
    expect(GlobalState.toggleModal()).toBeUndefined();
    expect(GlobalState.setModalContent(<div />)).toBeUndefined();
    expect(GlobalState.setThemeMode('dark')).toBeUndefined();
    expect(GlobalState.toggleDarkMode()).toBeUndefined();
  });
});
