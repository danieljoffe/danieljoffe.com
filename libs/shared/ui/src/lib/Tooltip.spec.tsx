import { render, screen, fireEvent, act } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders children', () => {
    render(
      <Tooltip content='Tooltip text'>
        <button>Hover me</button>
      </Tooltip>
    );
    expect(
      screen.getByRole('button', { name: 'Hover me' })
    ).toBeInTheDocument();
  });

  it('renders tooltip element with content', () => {
    const { container } = render(
      <Tooltip content='Tooltip text'>
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toBeInTheDocument();
    expect(screen.getByText('Tooltip text')).toBeInTheDocument();
  });

  it('tooltip is hidden by default', () => {
    const { container } = render(
      <Tooltip content='Tooltip text'>
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(tooltip).toHaveClass('opacity-0');
  });

  it('shows tooltip after delay on mouse enter', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
    expect(tooltip).toHaveClass('opacity-100');
  });

  it('hides tooltip on mouse leave', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    fireEvent.mouseLeave(trigger);

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    expect(tooltip).toHaveClass('opacity-0');
  });

  it('does not show tooltip if mouse leaves before delay', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    fireEvent.mouseLeave(trigger);

    act(() => {
      jest.advanceTimersByTime(100);
    });

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows tooltip on focus', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.focus(trigger);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
  });

  it('hides tooltip on blur', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.focus(trigger);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    fireEvent.blur(trigger);

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('hides tooltip on Escape key', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' delay={200}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button');
    fireEvent.mouseEnter(trigger);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    fireEvent.keyDown(trigger, { key: 'Escape' });

    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies top position with offset and centering by default', () => {
    const { container } = render(
      <Tooltip content='Tooltip text'>
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveClass('bottom-full', 'mb-2', '-translate-x-1/2');
  });

  it('applies bottom position with offset and centering', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' position='bottom'>
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveClass('top-full', 'mt-2', '-translate-x-1/2');
  });

  it('applies left position with offset and centering', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' position='left'>
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveClass('right-full', 'mr-2', '-translate-y-1/2');
  });

  it('applies right position with offset and centering', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' position='right'>
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = container.querySelector('[role="tooltip"]');
    expect(tooltip).toHaveClass('left-full', 'ml-2', '-translate-y-1/2');
  });

  it('uses custom delay', () => {
    const { container } = render(
      <Tooltip content='Tooltip text' delay={500}>
        <button>Hover me</button>
      </Tooltip>
    );

    const trigger = screen.getByRole('button');
    const tooltip = container.querySelector('[role="tooltip"]');

    fireEvent.mouseEnter(trigger);

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(tooltip).toHaveAttribute('aria-hidden', 'true');

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
  });

  it('links trigger to tooltip via aria-describedby', () => {
    const { container } = render(
      <Tooltip content='Tooltip text'>
        <button>Hover me</button>
      </Tooltip>
    );
    const tooltip = container.querySelector('[role="tooltip"]');
    const trigger = container.querySelector('[role="presentation"]');
    expect(tooltip).toHaveAttribute('id');
    expect(trigger).toHaveAttribute(
      'aria-describedby',
      tooltip?.getAttribute('id')
    );
  });
});
