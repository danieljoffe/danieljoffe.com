import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SourcesPanel from './SourcesPanel';

const mockToast = jest.fn();

jest.mock('@/state/Toast/ToastProvider', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const originalFetch = global.fetch;

const mockSources = [
  {
    id: 'src-1',
    board_token: 'stripe',
    company_name: 'Stripe',
    provider: 'greenhouse',
    enabled: true,
    last_polled_at: '2026-04-10T12:00:00Z',
    job_count: 12,
  },
  {
    id: 'src-2',
    board_token: 'vercel',
    company_name: 'Vercel',
    provider: 'greenhouse',
    enabled: false,
    last_polled_at: null,
    job_count: 0,
  },
];

function mockInitialFetch(sources: unknown[] = mockSources) {
  (global.fetch as jest.Mock).mockImplementation(
    (url: string, opts?: { method?: string }) => {
      if (typeof url === 'string' && url.includes('/detect')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              found: true,
              provider: 'greenhouse',
              board_token: 'notion',
              company_name: 'Notion',
              job_count: 5,
            }),
        });
      }
      if (!opts || opts.method !== 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sources }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }
  );
}

describe('SourcesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('shows spinner while loading', () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise(() => undefined)
    );
    render(<SourcesPanel />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders sources after fetch', async () => {
    mockInitialFetch();
    render(<SourcesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });
    expect(screen.getByText('stripe')).toBeInTheDocument();
    expect(screen.getByText('Vercel')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('Company Sources (2)')).toBeInTheDocument();
  });

  it('shows empty-state text when no sources configured', async () => {
    mockInitialFetch([]);
    render(<SourcesPanel />);

    await waitFor(() => {
      expect(screen.getByText(/no sources configured/i)).toBeInTheDocument();
    });
  });

  it('disables Detect button until input is filled', async () => {
    mockInitialFetch();
    render(<SourcesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    const detectBtn = screen.getByRole('button', { name: 'Detect' });
    expect(detectBtn).toBeDisabled();

    fireEvent.change(
      screen.getByPlaceholderText(
        'stripe, jobs.lever.co/netlify, notion.so/careers'
      ),
      { target: { value: 'notion' } }
    );
    expect(detectBtn).not.toBeDisabled();
  });

  it('shows detected result and allows adding', async () => {
    mockInitialFetch();
    render(<SourcesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        'stripe, jobs.lever.co/netlify, notion.so/careers'
      ),
      { target: { value: 'notion' } }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Detect' }));

    await waitFor(() => {
      expect(screen.getByText('Notion')).toBeInTheDocument();
    });
    expect(screen.getByText('5 jobs')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' })
      );
    });
  });

  it('manual entry works when expanded', async () => {
    mockInitialFetch();
    render(<SourcesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Show manual entry'));

    const addBtn = screen.getByRole('button', { name: 'Add' });
    expect(addBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('stripe'), {
      target: { value: 'notion' },
    });
    expect(addBtn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Stripe'), {
      target: { value: 'Notion' },
    });
    expect(addBtn).not.toBeDisabled();

    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'success' })
      );
    });
  });

  it('shows an error toast when initial load fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'nope' }),
    });

    render(<SourcesPanel />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'error',
          title: 'Failed to load sources',
        })
      );
    });
  });
});
