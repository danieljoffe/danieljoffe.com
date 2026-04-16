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
    enabled: true,
    last_polled_at: '2026-04-10T12:00:00Z',
    job_count: 12,
  },
  {
    id: 'src-2',
    board_token: 'vercel',
    company_name: 'Vercel',
    enabled: false,
    last_polled_at: null,
    job_count: 0,
  },
];

function mockInitialFetch(sources: unknown[] = mockSources) {
  (global.fetch as jest.Mock).mockImplementation(
    (_url: string, opts?: { method?: string }) => {
      if (!opts || opts.method !== 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sources }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
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

  it('disables Add button until both fields are filled', async () => {
    mockInitialFetch();
    render(<SourcesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

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
  });

  it('posts an add action and shows success toast', async () => {
    mockInitialFetch();
    render(<SourcesPanel />);

    await waitFor(() => {
      expect(screen.getByText('Stripe')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText('stripe'), {
      target: { value: 'notion' },
    });
    fireEvent.change(screen.getByPlaceholderText('Stripe'), {
      target: { value: 'Notion' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

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
