import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { InteractiveDemo } from './InteractiveDemo';

expect.extend(toHaveNoViolations);

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

  it('passes args as URL params to iframe', () => {
    render(
      <InteractiveDemo
        story='forms-button--default'
        title='Button Variants'
        args={{ variant: 'secondary', size: 'lg' }}
      />
    );

    triggerIntersection(true);

    const iframe = screen.getByTitle('Button Variants');
    expect(iframe).toHaveAttribute(
      'src',
      'https://ui.danieljoffe.com/iframe.html?id=forms-button--default&viewMode=story&args=variant:secondary;size:lg'
    );
  });

  it('omits args param when no args provided', () => {
    render(<InteractiveDemo story='button--primary' title='Button Demo' />);

    triggerIntersection(true);

    const iframe = screen.getByTitle('Button Demo');
    expect(iframe.getAttribute('src')).not.toContain('&args=');
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

  describe('controls', () => {
    const controls = [
      { label: 'Primary', args: { variant: 'primary' } },
      { label: 'Secondary', args: { variant: 'secondary' } },
      { label: 'Ghost', args: { variant: 'ghost' } },
    ];

    it('renders control buttons when controls prop is provided', () => {
      render(
        <InteractiveDemo
          story='forms-button--default'
          title='Button Variants'
          controls={controls}
        />
      );

      expect(screen.getByText('Primary')).toBeInTheDocument();
      expect(screen.getByText('Secondary')).toBeInTheDocument();
      expect(screen.getByText('Ghost')).toBeInTheDocument();
    });

    it('does not render controls when prop is omitted', () => {
      render(<InteractiveDemo story='button--primary' title='Button Demo' />);

      expect(
        screen.queryByRole('group', { name: 'Demo variant controls' })
      ).toBeNull();
    });

    it('uses first control args by default', () => {
      render(
        <InteractiveDemo
          story='forms-button--default'
          title='Button Variants'
          controls={controls}
        />
      );

      triggerIntersection(true);

      const iframe = screen.getByTitle('Button Variants');
      expect(iframe.getAttribute('src')).toContain('&args=variant:primary');
    });

    it('switches iframe args when a control is clicked', () => {
      render(
        <InteractiveDemo
          story='forms-button--default'
          title='Button Variants'
          controls={controls}
        />
      );

      triggerIntersection(true);

      fireEvent.click(screen.getByText('Secondary'));

      const iframe = screen.getByTitle('Button Variants');
      expect(iframe.getAttribute('src')).toContain('&args=variant:secondary');
    });

    it('highlights the active control', () => {
      render(
        <InteractiveDemo
          story='forms-button--default'
          title='Button Variants'
          controls={controls}
        />
      );

      const primaryBtn = screen.getByText('Primary');
      const secondaryBtn = screen.getByText('Secondary');

      // First control active by default
      expect(primaryBtn.className).toContain('bg-brand-500');
      expect(secondaryBtn.className).not.toContain('bg-brand-500');

      // Click second control
      fireEvent.click(secondaryBtn);

      expect(secondaryBtn.className).toContain('bg-brand-500');
      expect(primaryBtn.className).not.toContain('bg-brand-500');
    });

    it('controls override static args prop', () => {
      render(
        <InteractiveDemo
          story='forms-button--default'
          title='Button Variants'
          args={{ size: 'lg' }}
          controls={controls}
        />
      );

      triggerIntersection(true);

      const iframe = screen.getByTitle('Button Variants');
      // Should use control args, not static args
      expect(iframe.getAttribute('src')).toContain('&args=variant:primary');
      expect(iframe.getAttribute('src')).not.toContain('size:lg');
    });

    it('wraps controls in a group with accessible label', () => {
      render(
        <InteractiveDemo
          story='forms-button--default'
          title='Button Variants'
          controls={controls}
        />
      );

      expect(
        screen.getByRole('group', { name: 'Demo variant controls' })
      ).toBeInTheDocument();
    });
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <InteractiveDemo story='button--primary' title='Button Demo' />
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
