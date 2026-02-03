'use client';

import React, { useEffect } from 'react';
import Script from 'next/script';
import { GAParams } from './GoogleAnalytics.types';
import { devLog } from '@/utils/helpers';

let currDataLayerName: string | undefined = undefined;

// https://github.com/vercel/next.js/blob/canary/packages/third-parties/src/types/google.ts
export function GoogleAnalytics(props: GAParams) {
  const { gaId, debugMode, dataLayerName = 'dataLayer', nonce } = props;

  if (currDataLayerName === undefined) {
    currDataLayerName = dataLayerName;
  }

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

export function sendGAEvent(..._args: object[]) {
  if (currDataLayerName === undefined) {
    devLog('GA has not been initialized');
    return;
  }
  if (window[currDataLayerName]) {
    // @ts-expect-error - window[currDataLayerName] is not typed
    // eslint-disable-next-line prefer-rest-params
    window[currDataLayerName].push(arguments);
  } else {
    devLog(`GA dataLayer ${currDataLayerName} does not exist`);
  }
}
