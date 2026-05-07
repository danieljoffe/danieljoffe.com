import { act, renderHook, waitFor } from '@testing-library/react';
import { useInsights } from '../useInsights';

const PIPELINE = {
  velocity: [],
  funnel: [],
  total_applications: 0,
  total_interviews: 0,
  response_rate: null,
  avg_days_to_response: null,
  previous: null,
};

const TARGETS = {
  targets: [],
  score_distribution: [],
  score_trend: [],
};

const SKILLS_COST = {
  top_skills: [],
  top_missing: [],
  cost_over_time: [],
  cost_by_purpose: [],
};

const mockFetch = jest.fn();
const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => body,
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
});

describe('useInsights', () => {
  it('starts with all loading flags true', () => {
    mockFetch.mockImplementation(() => new Promise(() => undefined));
    const { result } = renderHook(() => useInsights('30d'));

    expect(result.current.loading.pipeline).toBe(true);
    expect(result.current.loading.targets).toBe(true);
    expect(result.current.loading.skillsCost).toBe(true);
    expect(result.current.loading.any).toBe(true);
    expect(result.current.loading.all).toBe(true);
    expect(result.current.error).toBeUndefined();
  });

  it('populates each slice when its endpoint resolves', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/pipeline'))
        return Promise.resolve(jsonResponse(PIPELINE));
      if (url.includes('/targets'))
        return Promise.resolve(jsonResponse(TARGETS));
      if (url.includes('/skills-cost'))
        return Promise.resolve(jsonResponse(SKILLS_COST));
      return Promise.reject(new Error('unknown'));
    });

    const { result } = renderHook(() => useInsights('30d'));

    await waitFor(() => {
      expect(result.current.loading.any).toBe(false);
    });

    expect(result.current.pipeline).toEqual(PIPELINE);
    expect(result.current.targets).toEqual(TARGETS);
    expect(result.current.skillsCost).toEqual(SKILLS_COST);
    expect(result.current.error).toBeUndefined();
    expect(result.current.failedEndpoints).toEqual([]);
  });

  it('sets failed endpoints when one request errors', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/pipeline'))
        return Promise.resolve(jsonResponse({ error: 'boom' }, 500));
      if (url.includes('/targets'))
        return Promise.resolve(jsonResponse(TARGETS));
      if (url.includes('/skills-cost'))
        return Promise.resolve(jsonResponse(SKILLS_COST));
      return Promise.reject(new Error('unknown'));
    });

    const { result } = renderHook(() => useInsights('30d'));

    await waitFor(() => {
      expect(result.current.loading.any).toBe(false);
    });

    expect(result.current.failedEndpoints).toEqual(['Pipeline']);
    expect(result.current.error).toMatch(/Pipeline/);
  });

  it('emits "Failed to load insights data" when all three fail', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve(jsonResponse({ error: 'boom' }, 500))
    );

    const { result } = renderHook(() => useInsights('30d'));

    await waitFor(() => {
      expect(result.current.loading.any).toBe(false);
    });

    expect(result.current.failedEndpoints).toHaveLength(3);
    expect(result.current.error).toBe('Failed to load insights data.');
  });

  it('treats a malformed shape as a failure', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/pipeline'))
        // missing velocity / funnel arrays
        return Promise.resolve(jsonResponse({ wrong: true }));
      if (url.includes('/targets'))
        return Promise.resolve(jsonResponse(TARGETS));
      if (url.includes('/skills-cost'))
        return Promise.resolve(jsonResponse(SKILLS_COST));
      return Promise.reject(new Error('unknown'));
    });

    const { result } = renderHook(() => useInsights('30d'));

    await waitFor(() => {
      expect(result.current.loading.any).toBe(false);
    });

    expect(result.current.failedEndpoints).toContain('Pipeline');
  });

  it('refresh() re-issues the requests', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/pipeline'))
        return Promise.resolve(jsonResponse(PIPELINE));
      if (url.includes('/targets'))
        return Promise.resolve(jsonResponse(TARGETS));
      if (url.includes('/skills-cost'))
        return Promise.resolve(jsonResponse(SKILLS_COST));
      return Promise.reject(new Error('unknown'));
    });

    const { result } = renderHook(() => useInsights('30d'));

    await waitFor(() => {
      expect(result.current.loading.any).toBe(false);
    });

    const initialCalls = mockFetch.mock.calls.length;

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it('appends ?period= to each endpoint', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/pipeline'))
        return Promise.resolve(jsonResponse(PIPELINE));
      if (url.includes('/targets'))
        return Promise.resolve(jsonResponse(TARGETS));
      if (url.includes('/skills-cost'))
        return Promise.resolve(jsonResponse(SKILLS_COST));
      return Promise.reject(new Error('unknown'));
    });

    const { result } = renderHook(() => useInsights('90d'));

    await waitFor(() => {
      expect(result.current.loading.any).toBe(false);
    });

    const urls = mockFetch.mock.calls.map(([u]) => u as string);
    expect(urls.every(u => u.includes('period=90d'))).toBe(true);
  });
});
