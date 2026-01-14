'use client';

import {
  GOOGLE_ANALYTICS_URL,
  GOOGLE_TAG_MANAGER_URL,
  HCAPTCHA_API_URL,
  HCAPTCHA_URL,
  SENTRY_URL,
  UNSPLASH_PHOTOS_URL,
  UNSPLASH_URL,
} from '@/utils/constants';

export default function HeadClient() {
  return (
    <head>
      {/* Preconnect to critical origins */}
      <link rel='preconnect' href={SENTRY_URL} />

      {/* DNS prefetch for third-party services */}
      <link rel='dns-prefetch' href={GOOGLE_TAG_MANAGER_URL} />
      <link rel='dns-prefetch' href={GOOGLE_ANALYTICS_URL} />
      <link rel='dns-prefetch' href={HCAPTCHA_URL} />
      <link rel='dns-prefetch' href={HCAPTCHA_API_URL} />

      {/* Prefetch image origins */}
      <link rel='prefetch' href={UNSPLASH_PHOTOS_URL} />
      <link rel='prefetch' href={UNSPLASH_URL} />
    </head>
  );
}
