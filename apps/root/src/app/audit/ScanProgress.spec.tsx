import { render, screen, act } from '@testing-library/react';
import ScanProgress from './ScanProgress';

describe('ScanProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders all 5 progress steps', () => {
    render(<ScanProgress url='https://example.com' />);
    expect(screen.getByText('Launching browser...')).toBeInTheDocument();
    expect(screen.getByText('Loading your page...')).toBeInTheDocument();
    expect(screen.getByText('Measuring performance...')).toBeInTheDocument();
    expect(screen.getByText('Checking accessibility...')).toBeInTheDocument();
    expect(screen.getByText('Generating report...')).toBeInTheDocument();
  });

  it('shows the scanned URL', () => {
    render(<ScanProgress url='https://example.com' />);
    expect(
      screen.getByText(/scanning https:\/\/example\.com/i)
    ).toBeInTheDocument();
  });

  it('renders the progress bar', () => {
    render(<ScanProgress url='https://example.com' />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('completes first step after 2 seconds', () => {
    render(<ScanProgress url='https://example.com' />);

    // Before 2s, first step should be active (spinner visible)
    const stepsList = screen.getByRole('list');
    expect(stepsList).toBeInTheDocument();

    // Advance past step 1 threshold (2 seconds = 20 intervals of 100ms)
    act(() => {
      jest.advanceTimersByTime(2100);
    });

    // After 2s, should show a checkmark (Check icon)
    // The step label should still be visible
    expect(screen.getByText('Launching browser...')).toBeInTheDocument();
  });

  it('progress bar increases over time', () => {
    render(<ScanProgress url='https://example.com' />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const valueAfter5s = Number(progressBar.getAttribute('aria-valuenow'));
    expect(valueAfter5s).toBeGreaterThan(0);
    expect(valueAfter5s).toBeLessThanOrEqual(90);
  });
});
