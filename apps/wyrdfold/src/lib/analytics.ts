type EventParams = Record<string, string | number | boolean>;

function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window === 'undefined') return;
  window.gtag?.('event', eventName, params ?? {});
}

// Minimal surface — wyrdfold only uses what its components emit. Add
// new events as they're introduced; mirror root/lib/analytics.ts
// patterns when the surface grows past a handful of events.
export const analytics = {
  themeToggle: (theme: 'light' | 'dark' | 'system') =>
    trackEvent('theme_toggle', { theme }),
};
