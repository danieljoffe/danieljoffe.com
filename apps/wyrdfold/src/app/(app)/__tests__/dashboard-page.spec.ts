/**
 * Tests for the dashboard route (`page.tsx`) — server component that
 * gates new users into the onboarding wizard. The presentational
 * `DashboardPage` is tested separately in `DashboardPage.spec.tsx`.
 */

const mockRedirect = jest.fn((_target: string) => {
  // Match Next.js behaviour: `redirect()` throws to abort rendering.
  throw new Error(`REDIRECT:${_target}`);
});

const mockFetch = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (target: string) => mockRedirect(target),
}));

jest.mock('@/lib/api/proxy', () => ({
  fetchJsonFromWyrdfoldAPI: (...args: unknown[]) => mockFetch(...args),
}));

// Re-import after mocks are set up.
import WyrdfoldDashboard from '../dashboard/page';

describe('WyrdfoldDashboard route', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockFetch.mockClear();
  });

  it('redirects to /onboarding when the user has no prose yet', async () => {
    // First API call is the prose check; subsequent calls don't matter
    // because we redirect before reaching the Promise.all.
    mockFetch.mockResolvedValueOnce({ prose: null });

    await expect(WyrdfoldDashboard()).rejects.toThrow('REDIRECT:/onboarding');

    expect(mockRedirect).toHaveBeenCalledWith('/onboarding');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/experience/prose');
  });

  it('redirects to /onboarding when the prose endpoint returns null', async () => {
    // Some upstream errors surface as a null response (e.g. when the
    // API JWT verification fails silently). Treat null the same as
    // empty prose — sending the user to /onboarding is the safer
    // default than rendering a broken empty dashboard.
    mockFetch.mockResolvedValueOnce(null);

    await expect(WyrdfoldDashboard()).rejects.toThrow('REDIRECT:/onboarding');

    expect(mockRedirect).toHaveBeenCalledWith('/onboarding');
  });

  it('renders the dashboard when the user has prose authored', async () => {
    // Returning user: prose populated. Subsequent fetches (jobs,
    // targets, counts) all need to return a sensible shape.
    mockFetch.mockResolvedValueOnce({
      id: 'p-1',
      content: 'My experience...',
      version: 1,
    });
    // The Promise.all that follows fires the prose fetch a SECOND time,
    // plus jobs/targets/N counts. Make every subsequent call return a
    // benign empty response.
    mockFetch.mockResolvedValue({
      prose: { id: 'p-1', content: 'My experience...' },
      postings: [],
      total: 0,
      page: 1,
      page_size: 5,
      targets: [],
    });

    const result = await WyrdfoldDashboard();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
