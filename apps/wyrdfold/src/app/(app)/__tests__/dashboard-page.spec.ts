/**
 * Tests for the dashboard route (`page.tsx`) — server component that
 * gates new users into the onboarding wizard via the explicit
 * `onboarding_completed_at` flag, with a `hasProse` fallback.
 *
 * See plan-wyrdfold-onboarding-completion-tracking.md.
 */

const mockRedirect = jest.fn((target: string) => {
  // Match Next.js behaviour: `redirect()` throws to abort rendering.
  throw new Error(`REDIRECT:${target}`);
});

const mockFetch = jest.fn();
const mockSentryCapture = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (target: string) => mockRedirect(target),
}));

jest.mock('@/lib/api/proxy', () => ({
  fetchJsonFromWyrdfoldAPI: (...args: unknown[]) => mockFetch(...args),
}));

jest.mock('@sentry/nextjs', () => ({
  captureMessage: (msg: string, opts: unknown) => mockSentryCapture(msg, opts),
}));

// Re-import after mocks are set up.
import WyrdfoldDashboard from '../dashboard/page';

describe('WyrdfoldDashboard route', () => {
  beforeEach(() => {
    mockRedirect.mockClear();
    mockFetch.mockClear();
    mockSentryCapture.mockClear();
  });

  it('redirects to /onboarding when the flag is null (brand-new user)', async () => {
    mockFetch.mockResolvedValueOnce({
      completed_at: null,
      path: null,
      current_step: null,
    });

    await expect(WyrdfoldDashboard()).rejects.toThrow('REDIRECT:/onboarding');

    expect(mockRedirect).toHaveBeenCalledWith('/onboarding');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith('/profile/onboarding');
    // We bail before the bulk data fetch — keeps the new-user request
    // cheap on the API.
    expect(mockSentryCapture).not.toHaveBeenCalled();
  });

  it('redirects to /onboarding when the onboarding endpoint returns null', async () => {
    // Degraded API (auth failure, network blip). Safer default is to
    // route to /onboarding than render a broken empty dashboard.
    mockFetch.mockResolvedValueOnce(null);

    await expect(WyrdfoldDashboard()).rejects.toThrow('REDIRECT:/onboarding');

    expect(mockRedirect).toHaveBeenCalledWith('/onboarding');
  });

  it('renders the empty-state dashboard + emits Sentry warning when flag is set but prose is missing', async () => {
    // Data drift OR legitimate Path A/B user who skipped the resume
    // step (e.g. upload failed mid-flow). Surface to Sentry so we
    // notice; render the dashboard's existing empty state ("Set up
    // profile" CTA) rather than bouncing back to /onboarding — the
    // wizard restarts at path-chooser, so bouncing creates a redirect
    // loop for any user without prose.
    mockFetch
      .mockResolvedValueOnce({
        completed_at: '2026-06-01T00:00:00Z',
        path: 'A',
        current_step: 'completion',
      })
      // Then the Promise.all: jobs, prose (null), targets, ...counts
      .mockResolvedValueOnce({ postings: [], total: 0, page: 1, page_size: 5 })
      .mockResolvedValueOnce({ prose: null }) // ← prose missing
      .mockResolvedValue({ targets: [], postings: [], total: 0 });

    const result = await WyrdfoldDashboard();

    expect(mockSentryCapture).toHaveBeenCalledWith(
      'dashboard:onboarding_flag_set_but_no_prose',
      expect.objectContaining({ level: 'warning' })
    );
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('renders the dashboard when the flag is set and prose exists', async () => {
    mockFetch
      .mockResolvedValueOnce({
        completed_at: '2026-06-01T00:00:00Z',
        path: 'A',
        current_step: 'completion',
      })
      .mockResolvedValueOnce({ postings: [], total: 0, page: 1, page_size: 5 })
      .mockResolvedValueOnce({
        id: 'p-1',
        content: 'My experience...',
        version: 1,
      })
      .mockResolvedValue({ targets: [], postings: [], total: 0 });

    const result = await WyrdfoldDashboard();

    expect(mockRedirect).not.toHaveBeenCalled();
    expect(mockSentryCapture).not.toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
