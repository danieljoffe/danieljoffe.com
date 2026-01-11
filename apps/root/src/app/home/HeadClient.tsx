'use client';

import {
  GOOGLE_ANALYTICS_URL,
  GOOGLE_TAG_MANAGER_URL,
  SENTRY_URL,
  UNSPLASH_PHOTOS_URL,
  UNSPLASH_URL,
} from '@/utils/constants';
// import '@/app/global.scss';

export default function HeadClient() {
  return (
    <head>
      <link rel='preconnect' href={SENTRY_URL} />
      <link rel='dns-prefetch' href={GOOGLE_TAG_MANAGER_URL} />
      <link rel='dns-prefetch' href={GOOGLE_ANALYTICS_URL} />
      <link rel='prefetch' href={UNSPLASH_PHOTOS_URL} />
      <link rel='prefetch' href={UNSPLASH_URL} />
    </head>
  );
}
