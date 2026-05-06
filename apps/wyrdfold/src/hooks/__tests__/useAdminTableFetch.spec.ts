import { renderHook, waitFor, act } from '@testing-library/react';
import { useAdminTableFetch } from '../useAdminTableFetch';

const mockResponse = {
  items: [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ],
  total: 42,
};

const mockFetch = jest.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => mockResponse,
  } as Response);
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  mockFetch.mockReset();
});

describe('useAdminTableFetch', () => {
  const defaultOptions = {
    endpoint: '/api/test',
    defaultSort: 'created_at' as const,
    dataKey: 'items',
  };

  it('fetches data on mount', async () => {
    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResponse.items);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test?')
    );
  });

  it('sends correct query parameters', async () => {
    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const url = mockFetch.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split('?')[1]);
    expect(params.get('page')).toBe('1');
    expect(params.get('pageSize')).toBe('20');
    expect(params.get('sort')).toBe('created_at');
    expect(params.get('order')).toBe('desc');
  });

  it('calculates totalPages from total and pageSize', async () => {
    const { result } = renderHook(() =>
      useAdminTableFetch({ ...defaultOptions, pageSize: 10 })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(5); // ceil(42/10)
  });

  it('uses default pageSize of 20', async () => {
    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalPages).toBe(3); // ceil(42/20)
  });

  it('starts in loading state', () => {
    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));
    expect(result.current.loading).toBe(true);
  });

  it('handles failed responses gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);

    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
    expect(result.current.totalPages).toBe(0);
  });

  it('refetches when page changes', async () => {
    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(2);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const calls = mockFetch.mock.calls;
    const lastUrl = calls[calls.length - 1][0] as string;
    const params = new URLSearchParams(lastUrl.split('?')[1]);
    expect(params.get('page')).toBe('2');
  });

  it('resets page to 1 when sort changes', async () => {
    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setPage(3);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.handleSort('created_at');
    });

    expect(result.current.page).toBe(1);
  });

  it('exposes refetch function', async () => {
    const { result } = renderHook(() => useAdminTableFetch(defaultOptions));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const callCount = mockFetch.mock.calls.length;

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetch.mock.calls.length).toBe(callCount + 1);
  });
});
