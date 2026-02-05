declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: 'event' | 'config' | 'set' | 'js',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void;
    [key: string]: unknown[] | undefined;
  }
}

export {};
