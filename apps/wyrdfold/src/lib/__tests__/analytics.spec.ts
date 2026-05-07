import { analytics } from '../analytics';

const mockGtag = jest.fn();
const win = window as unknown as Record<string, unknown>;

beforeEach(() => {
  win.gtag = mockGtag;
  mockGtag.mockClear();
});

afterEach(() => {
  delete win.gtag;
});

describe('analytics (wyrdfold)', () => {
  it('tracks theme toggle events', () => {
    analytics.themeToggle('dark');
    expect(mockGtag).toHaveBeenCalledWith('event', 'theme_toggle', {
      theme: 'dark',
    });
  });

  it('emits theme_toggle for each theme value', () => {
    analytics.themeToggle('light');
    analytics.themeToggle('system');
    expect(mockGtag).toHaveBeenNthCalledWith(1, 'event', 'theme_toggle', {
      theme: 'light',
    });
    expect(mockGtag).toHaveBeenNthCalledWith(2, 'event', 'theme_toggle', {
      theme: 'system',
    });
  });

  it('does not throw when window.gtag is undefined', () => {
    delete win.gtag;
    expect(() => analytics.themeToggle('dark')).not.toThrow();
  });
});
