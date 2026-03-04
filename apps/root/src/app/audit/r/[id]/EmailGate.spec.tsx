import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import type { ScanIssue } from '@danieljoffe.com/shared-audit';
import EmailGate from './EmailGate';

const mockGatedIssues: ScanIssue[] = [
  {
    id: 'issue-4',
    scan_id: 'scan-1',
    category: 'performance',
    severity: 'warning',
    title: 'Images not compressed',
    description: 'Images could be smaller.',
    impact: 'Reduces load time.',
    fix_difficulty: 'easy',
    technical_detail: null,
    sort_order: 3,
  },
  {
    id: 'issue-5',
    scan_id: 'scan-1',
    category: 'accessibility',
    severity: 'warning',
    title: 'Missing alt text',
    description: 'Some images lack alt text.',
    impact: null,
    fix_difficulty: 'easy',
    technical_detail: null,
    sort_order: 4,
  },
];

const originalFetch = global.fetch;

describe('EmailGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders locked state with issue count', () => {
    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    expect(screen.getByText(/unlock 2 more fixes/i)).toBeInTheDocument();
  });

  it('renders email input and submit button', () => {
    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    expect(
      screen.getByRole('textbox', { name: /email address/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /get full report/i })
    ).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    const emailInput = screen.getByRole('textbox', { name: /email address/i });

    fireEvent.change(emailInput, { target: { value: 'bad-email' } });
    fireEvent.click(screen.getByRole('button', { name: /get full report/i }));

    expect(
      await screen.findByText(/please enter a valid email/i)
    ).toBeInTheDocument();
  });

  it('submits email and reveals issues on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'captured', lead_id: 'lead-1' }),
    });

    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    const emailInput = screen.getByRole('textbox', { name: /email address/i });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: 'user@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /get full report/i }));
    });

    await waitFor(() => {
      // After unlock, the actual issue cards should be visible (not blurred)
      expect(screen.getByText('Images not compressed')).toBeInTheDocument();
      expect(screen.getByText('Missing alt text')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/leads/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        scan_id: 'scan-1',
        source: 'full_report',
      }),
    });
  });

  it('handles already_captured response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ status: 'already_captured', lead_id: 'lead-1' }),
    });

    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    const emailInput = screen.getByRole('textbox', { name: /email address/i });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: 'user@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /get full report/i }));
    });

    await waitFor(() => {
      expect(screen.getByText('Images not compressed')).toBeInTheDocument();
    });
  });

  it('handles server error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    const emailInput = screen.getByRole('textbox', { name: /email address/i });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: 'user@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /get full report/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    const emailInput = screen.getByRole('textbox', { name: /email address/i });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: 'user@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /get full report/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });

  it('retry after error resets to locked state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<EmailGate gatedIssues={mockGatedIssues} scanId='scan-1' />);
    const emailInput = screen.getByRole('textbox', { name: /email address/i });

    await act(async () => {
      fireEvent.change(emailInput, {
        target: { value: 'user@example.com' },
      });
      fireEvent.click(screen.getByRole('button', { name: /get full report/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/try again/i));

    expect(
      screen.getByRole('button', { name: /get full report/i })
    ).toBeInTheDocument();
  });

  it('renders singular "fix" for 1 gated issue', () => {
    render(<EmailGate gatedIssues={[mockGatedIssues[0]]} scanId='scan-1' />);
    expect(screen.getByText(/unlock 1 more fix$/i)).toBeInTheDocument();
  });
});
