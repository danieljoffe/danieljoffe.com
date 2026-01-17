declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
    dataLayer?: Object[] | undefined;
    gtag?: (
      command: 'event' | 'config' | 'set' | 'js',
      targetId: string | Date,
      params?: Record<string, unknown>
    ) => void;
    [key: string]: unknown;
  }
}

export type GAParams = {
  gaId: string;
  dataLayerName?: string;
  debugMode?: boolean;
  nonce?: string | undefined;
};
