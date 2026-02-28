import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import URLInputForm from './URLInputForm';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
}));

const originalFetch = global.fetch;

describe('URLInputForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('renders the URL input and submit button', () => {
    render(<URLInputForm />);
    expect(
      screen.getByRole('textbox', { name: /website url/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /audit this site/i })
    ).toBeInTheDocument();
  });

  it('renders the device selector with Mobile selected by default', () => {
    render(<URLInputForm />);
    const mobileRadio = screen.getByRole('radio', { name: /mobile/i });
    expect(mobileRadio).toBeChecked();
  });

  it('sends device in the POST body', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          scan_id: 'cached-id',
          status: 'completed',
          cached: true,
        }),
    });

    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });

    // Select desktop
    fireEvent.click(screen.getByRole('radio', { name: /desktop/i }));

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    });

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.device).toBe('desktop');
  });

  it('shows validation error for empty URL', async () => {
    render(<URLInputForm />);
    fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    expect(await screen.findByText(/please enter a url/i)).toBeInTheDocument();
  });

  it('shows validation error for invalid URL on blur', () => {
    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });
    fireEvent.change(input, { target: { value: 'not-a-url' } });
    fireEvent.blur(input);
    expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();
  });

  it('clears validation error when typing', () => {
    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });
    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.blur(input);
    expect(screen.getByText(/please enter a valid url/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'example.com' } });
    expect(
      screen.queryByText(/please enter a valid url/i)
    ).not.toBeInTheDocument();
  });

  it('submits valid URL and shows progress', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ scan_id: 'abc-123', status: 'pending' }),
      })
      // Immediate poll fires once polling phase starts
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ id: 'abc-123', status: 'pending', grade: null }),
      });

    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    });

    await waitFor(() => {
      expect(
        screen.getByText(/scanning https:\/\/example\.com/i)
      ).toBeInTheDocument();
    });
  });

  it('handles cached scan redirect', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          scan_id: 'cached-id',
          status: 'completed',
          cached: true,
        }),
    });

    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/audit/r/cached-id');
    });
  });

  it('handles rate limit error (429)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () =>
        Promise.resolve({
          error: 'Rate limit exceeded. Please try again later.',
        }),
    });

    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/too many scans/i)).toBeInTheDocument();
    });
  });

  it('handles server error (500)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument();
    });
  });

  it('retry after error resets to idle state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' }),
    });

    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/try again/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/try again/i));

    expect(
      screen.getByRole('button', { name: /audit this site/i })
    ).toBeInTheDocument();
  });

  it('handles network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    );

    render(<URLInputForm />);
    const input = screen.getByRole('textbox', { name: /website url/i });

    await act(async () => {
      fireEvent.change(input, { target: { value: 'https://example.com' } });
      fireEvent.click(screen.getByRole('button', { name: /audit this site/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });
  });
});
