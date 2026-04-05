import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { InteractiveDemo } from './InteractiveDemo';

jest.mock('@/utils/constants', () => ({
  STORYBOOK_URL: 'https://ui.danieljoffe.com',
}));

// Mock IntersectionObserver
let intersectionCallback: IntersectionObserverCallback;
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();

beforeEach(() => {
  mockObserve.mockClear();
  mockDisconnect.mockClear();
  window.IntersectionObserver = jest.fn(callback => {
    intersectionCallback = callback;
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: jest.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: jest.fn(),
    };
  });
});

function triggerIntersection(isIntersecting: boolean) {
  act(() => {
    intersectionCallback(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });
}

describe('InteractiveDemo', () => {
  it('renders the title bar with Storybook link', () => {
    render(<InteractiveDemo story='button--primary' title='Button Demo' />);

    expect(screen.getByText('Button Demo')).toBeInTheDocument();
    const link = screen.getByText('Open in Storybook');
    expect(link).toHaveAttribute(
      'href',
      'https://ui.danieljoffe.com/?path=/story/button--primary'
    );
  });

  it('shows skeleton initially (before intersection)', () => {
    const { container } = render(
      <InteractiveDemo story='button--primary' title='Button Demo' />
    );

    // Skeleton should be visible
    expect(
      container.querySelector('[class*="animate-pulse"]')
    ).toBeInTheDocument();
    // No iframe yet
    expect(screen.queryByTitle('Button Demo')).toBeNull();
  });

  it('renders iframe after intersection', () => {
    render(<InteractiveDemo story='button--primary' title='Button Demo' />);

    triggerIntersection(true);

    const iframe = screen.getByTitle('Button Demo');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute(
      'src',
      'https://ui.danieljoffe.com/iframe.html?id=button--primary&viewMode=story'
    );
  });

  it('disconnects observer after intersection', () => {
    render(<InteractiveDemo story='button--primary' title='Button Demo' />);

    triggerIntersection(true);
    expect(mockDisconnect).toHaveBeenCalled();
  });

  it('hides skeleton after iframe loads', () => {
    const { container } = render(
      <InteractiveDemo story='button--primary' title='Button Demo' />
    );

    triggerIntersection(true);

    const iframe = screen.getByTitle('Button Demo');
    act(() => {
      iframe.dispatchEvent(new Event('load'));
    });

    // Skeleton should be gone
    expect(
      container.querySelector('[class*="animate-pulse"]')
    ).not.toBeInTheDocument();
  });

  it('has sandbox attribute on iframe', () => {
    render(<InteractiveDemo story='button--primary' title='Button Demo' />);

    triggerIntersection(true);

    const iframe = screen.getByTitle('Button Demo');
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin'
    );
  });
});
