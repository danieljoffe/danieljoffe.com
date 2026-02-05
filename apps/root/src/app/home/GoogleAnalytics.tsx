'use client';

import { useEffect, useRef } from 'react';
import Script from 'next/script';
import { devLog } from '@/utils/helpers';

type GAProps = {
  gaId: string;
  dataLayerName?: string;
  debugMode?: boolean;
  nonce?: string | undefined;
};

// Module-level ref to store the dataLayer name for sendGAEvent
let currDataLayerName: string | undefined = undefined;

// https://github.com/vercel/next.js/blob/canary/packages/third-parties/src/types/google.ts
export function GoogleAnalytics(props: GAProps) {
  const { gaId, debugMode, dataLayerName = 'dataLayer', nonce } = props;
  const isInitialized = useRef(false);

  useEffect(() => {
    // Set the dataLayer name only once on mount
    if (!isInitialized.current) {
      currDataLayerName = dataLayerName;
      isInitialized.current = true;
    }
  }, [dataLayerName]);

  useEffect(() => {
    // performance.mark is being used as a feature use signal. While it is traditionally used for performance
    // benchmarking it is low overhead and thus considered safe to use in production and it is a widely available
    // existing API.
    // The performance measurement will be handled by Chrome Aurora

    performance.mark('mark_feature_usage', {
      detail: {
        feature: 'next-third-parties-ga',
      },
    });
  }, []);

  return (
    <>
      <Script
        strategy='afterInteractive'
        id='_next-ga-init'
        dangerouslySetInnerHTML={{
          __html: `
          window['${dataLayerName}'] = window['${dataLayerName}'] || [];
          function gtag(){window['${dataLayerName}'].push(arguments);}
          gtag('js', new Date());

          gtag('config', '${gaId}' ${
            debugMode ? ",{ 'debug_mode': true }" : ''
          });`,
        }}
        nonce={nonce}
      />
      <Script
        strategy='afterInteractive'
        id='_next-ga'
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        nonce={nonce}
        async
      />
    </>
  );
}

export function sendGAEvent(...args: [string, ...unknown[]]) {
  if (currDataLayerName == null) {
    devLog('GA has not been initialized');
    return;
  }

  const dataLayer = window[currDataLayerName];
  if (dataLayer) {
    dataLayer.push(args);
  } else {
    devLog(`GA dataLayer ${currDataLayerName} does not exist`);
  }
}
